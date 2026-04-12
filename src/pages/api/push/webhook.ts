import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { getEnv } from '../../../lib/env.ts';

/**
 * POST /api/push/webhook
 * Called by Supabase Database Webhook on user_notifications INSERT.
 * Sends push notifications to the user's registered devices.
 *
 * Alternatively, called from the realtime listener or cron.
 * Body: { record: { user_id, type, actor_name, message, post_id, ... } }
 *       or { type: 'INSERT', record: { ... } } (Supabase webhook format)
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const record = body.record || body;
  const userId = record.user_id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'No user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Get user's push subscriptions
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Build notification content based on type
  const notifContent = buildPushContent(record);

  const env = getEnv();
  const vapidPublic = import.meta.env.PUBLIC_VAPID_KEY;
  const vapidPrivate = (env as any).VAPID_PRIVATE_KEY;

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = JSON.stringify(notifContent);
  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    try {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapidPublic,
        vapidPrivate
      );
      if (result === 'ok') sent++;
      else if (result === 'expired') expired.push(sub.id);
    } catch {
      expired.push(sub.id);
    }
  }

  if (expired.length > 0) {
    await service.from('push_subscriptions').delete().in('id', expired);
  }

  return new Response(JSON.stringify({ ok: true, sent, cleaned: expired.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

function buildPushContent(record: any) {
  const actor = record.actor_name || 'Someone';
  const type = record.type;
  const preview = record.message ? `: "${record.message.slice(0, 60)}"` : '';

  const typeMap: Record<string, { title: string; body: string; url: string; tag: string }> = {
    post_liked: {
      title: '❤️ Post Liked',
      body: `${actor} liked your post${preview}`,
      url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications',
      tag: `post-liked-${record.post_id || ''}`,
    },
    comment_liked: {
      title: '💗 Comment Liked',
      body: `${actor} liked your comment${preview}`,
      url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications',
      tag: `comment-liked-${record.comment_id || ''}`,
    },
    post_commented: {
      title: '💬 New Comment',
      body: `${actor} commented on your post${preview}`,
      url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications',
      tag: `post-commented-${record.post_id || ''}`,
    },
    friend_request: {
      title: '👋 Friend Request',
      body: `${actor} wants to be your friend`,
      url: '/account/friends',
      tag: `friend-request-${record.actor_id || ''}`,
    },
    friend_accepted: {
      title: '🤝 Friend Accepted',
      body: `${actor} accepted your friend request`,
      url: '/account/friends',
      tag: `friend-accepted-${record.actor_id || ''}`,
    },
    new_message: {
      title: '✉️ New Message',
      body: `${actor}${preview || ' sent you a message'}`,
      url: '/account/messages',
      tag: `message-${record.actor_id || ''}`,
    },
    new_community_post: {
      title: '📝 New Post',
      body: `${actor} posted in the community${preview}`,
      url: record.post_id ? `/community/board/${record.post_id}` : '/community/board',
      tag: `new-post-${record.post_id || ''}`,
    },
    new_member_signup: {
      title: '🎉 New Member',
      body: `${actor} joined the community`,
      url: '/admin/members',
      tag: `new-member-${record.actor_id || ''}`,
    },
  };

  return typeMap[type] || {
    title: 'KefaloniaBNB',
    body: `${actor}: ${type}`,
    url: '/account/notifications',
    tag: 'kefalonia-notification',
  };
}

// ── Web Push Implementation (same as send.ts but self-contained) ──────────

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<'ok' | 'expired' | 'error'> {
  const urlObj = new URL(subscription.endpoint);
  const audience = `${urlObj.protocol}//${urlObj.hostname}`;

  const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);
  const encrypted = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encrypted,
  });

  if (response.status === 201 || response.status === 200) return 'ok';
  if (response.status === 404 || response.status === 410) return 'expired';
  return 'error';
}

async function createVapidJwt(audience: string, publicKey: string, privateKey: string): Promise<string> {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ aud: audience, exp: now + 43200, sub: 'mailto:info@kefaloniabnb.com' }));
  const signingInput = `${header}.${payload}`;

  const pubKeyBytes = b64dec(publicKey);
  const x = b64url(pubKeyBytes.slice(1, 33));
  const y = b64url(pubKeyBytes.slice(33, 65));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKey, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sigBytes = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput)));
  return `${header}.${payload}.${b64url(derToRaw(sigBytes))}`;
}

async function encryptPayload(payload: string, p256dhKey: string, authKey: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(payload);
  const clientPub = b64dec(p256dhKey);
  const clientAuth = b64dec(authKey);

  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  const clientKey = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeys.privateKey, 256));

  const authInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...clientPub, ...serverPubRaw]);
  const ikm = await hkdf(clientAuth, shared, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const padded = new Uint8Array(data.length + 1);
  padded.set(data);
  padded[data.length] = 0x02;

  const encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encKey, padded));

  const rs = encrypted.length + 86;
  const hdr = new Uint8Array(86);
  hdr.set(salt, 0);
  hdr[16] = (rs >> 24) & 0xff; hdr[17] = (rs >> 16) & 0xff; hdr[18] = (rs >> 8) & 0xff; hdr[19] = rs & 0xff;
  hdr[20] = 65;
  hdr.set(serverPubRaw, 21);

  const result = new Uint8Array(hdr.length + encrypted.length);
  result.set(hdr);
  result.set(encrypted, hdr.length);
  return result;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), ikm));
  const inf = new Uint8Array([...info, 1]);
  return new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), inf)).slice(0, len);
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64dec(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  const raw = new Uint8Array(64);
  let off = 2;
  const rLen = der[off + 1]; off += 2;
  const rS = rLen > 32 ? off + (rLen - 32) : off;
  raw.set(der.slice(rS, rS + Math.min(rLen, 32)), rLen < 32 ? 32 - rLen : 0);
  off += rLen;
  const sLen = der[off + 1]; off += 2;
  const sS = sLen > 32 ? off + (sLen - 32) : off;
  raw.set(der.slice(sS, sS + Math.min(sLen, 32)), sLen < 32 ? 64 - sLen : 32);
  return raw;
}
