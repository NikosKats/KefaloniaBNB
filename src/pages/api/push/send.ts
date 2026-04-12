import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { getEnv } from '../../../lib/env.ts';

/**
 * POST /api/push/send
 * Internal endpoint: sends push notifications to a user's devices.
 * Called by the notification webhook or from server-side code.
 * Body: { user_id, title, body, url?, tag? }
 *
 * Protected by internal secret or admin session.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Auth: must be admin or have the internal push secret
  const env = getEnv();
  const pushSecret = request.headers.get('x-push-secret');
  const isAdmin = locals.profile?.role === 'admin' || locals.profile?.role === 'super_admin';
  const isInternal = pushSecret && pushSecret === (env as any).PUSH_SECRET;

  if (!isAdmin && !isInternal) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { user_id, title, body: pushBody, url, tag } = body;
  if (!user_id || !title || !pushBody) {
    return new Response(JSON.stringify({ error: 'user_id, title, and body required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user_id);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = JSON.stringify({
    title,
    body: pushBody,
    icon: '/icons/icon-192.png',
    url: url || '/account/notifications',
    tag: tag || 'kefalonia-notification',
  });

  const vapidPublic = import.meta.env.PUBLIC_VAPID_KEY;
  const vapidPrivate = (env as any).VAPID_PRIVATE_KEY;

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
      if (result === 'ok') {
        sent++;
      } else if (result === 'expired') {
        expired.push(sub.id);
      }
    } catch {
      // Subscription may be invalid
      expired.push(sub.id);
    }
  }

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await service.from('push_subscriptions').delete().in('id', expired);
  }

  return new Response(JSON.stringify({ ok: true, sent, cleaned: expired.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

/**
 * Minimal Web Push implementation using the Web Crypto API (available in Cloudflare Workers).
 * No npm dependencies needed — uses standard Web APIs.
 */
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<'ok' | 'expired' | 'error'> {
  const urlObj = new URL(subscription.endpoint);
  const audience = `${urlObj.protocol}//${urlObj.hostname}`;

  // Create JWT for VAPID
  const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);

  // Encrypt payload using Web Crypto
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
  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: 'mailto:info@kefaloniabnb.com',
  }));

  const signingInput = `${header}.${payload}`;

  // Import the VAPID private key
  const keyData = base64urlDecode(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Cloudflare Workers crypto.subtle doesn't support raw EC import for signing
  // We need to use JWK format instead
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey,
    x: publicKey.slice(0, 43), // First 32 bytes of uncompressed public key (base64url)
    y: publicKey.slice(43),    // Last 32 bytes
  };

  // Actually, the public key is in the uncompressed point format.
  // Let's decode it properly.
  const pubKeyBytes = base64urlDecode(publicKey);
  // Uncompressed point: 0x04 || x (32 bytes) || y (32 bytes)
  const x = base64urlEncode(pubKeyBytes.slice(1, 33));
  const y = base64urlEncode(pubKeyBytes.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKey, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format
  const sig = derToRaw(new Uint8Array(sigBytes));
  const signature = base64urlEncode(sig);

  return `${header}.${payload}.${signature}`;
}

async function encryptPayload(payload: string, p256dhKey: string, authKey: string): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Decode subscription keys
  const clientPublicKey = base64urlDecode(p256dhKey);
  const clientAuth = base64urlDecode(authKey);

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  // HKDF for auth secret
  const authInfo = new TextEncoder().encode('WebPush: info\0');
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKey.length + serverPublicKeyRaw.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(clientPublicKey, authInfo.length);
  authInfoFull.set(serverPublicKeyRaw, authInfo.length + clientPublicKey.length);

  const ikm = await hkdf(clientAuth, sharedSecret, authInfoFull, 32);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad the payload (add 0x02 delimiter + padding)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 0x02; // Delimiter

  // Encrypt with AES-128-GCM
  const encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encKey, paddedPayload)
  );

  // Build aes128gcm header: salt (16) || record size (4) || key id length (1) || key id (65)
  const recordSize = encrypted.length + 86; // header + encrypted
  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65; // key id length (uncompressed point)
  header.set(serverPublicKeyRaw, 21);

  // Combine header + encrypted
  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);

  return result;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), ikm));

  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoFull = new Uint8Array(info.length + 1);
  infoFull.set(info);
  infoFull[info.length] = 1;

  const derived = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoFull));
  return derived.slice(0, length);
}

function base64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (der.length === 64) return der;

  // Parse DER SEQUENCE
  const raw = new Uint8Array(64);
  let offset = 2; // Skip SEQUENCE tag + length

  // R value
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), rDest);
  offset += rLen;

  // S value
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), sDest);

  return raw;
}
