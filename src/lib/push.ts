import { getServiceClient } from './supabase.ts';

/**
 * Send push notifications to a user's registered devices.
 * Non-blocking — catches all errors silently.
 */
export async function sendPushToUser(record: {
  user_id: string;
  type: string;
  actor_name?: string;
  message?: string;
  post_id?: string;
  comment_id?: string;
  actor_id?: string;
}) {
  try {
    const service = getServiceClient();
    const { data: subs } = await service
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', record.user_id);

    if (!subs || subs.length === 0) {
      console.log('[push] No subscriptions for user', record.user_id);
      return;
    }
    console.log(`[push] Sending ${record.type} to ${subs.length} device(s) for user ${record.user_id}`);

    const vapidPublic = import.meta.env.PUBLIC_VAPID_KEY ?? '';
    const vapidPrivate = import.meta.env.VAPID_PRIVATE_KEY ?? '';

    if (!vapidPublic || !vapidPrivate) {
      console.warn('[push] VAPID keys missing — skipping push', { hasPub: !!vapidPublic, hasPriv: !!vapidPrivate });
      return;
    }

    const content = buildPushContent(record);
    const payload = JSON.stringify(content);
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          vapidPublic,
          vapidPrivate
        );
        if (result === 'expired') expired.push(sub.id);
      } catch {
        expired.push(sub.id);
      }
    }

    if (expired.length > 0) {
      await service.from('push_subscriptions').delete().in('id', expired);
    }
  } catch {
    // Push is best-effort, never block the main flow
  }
}

/**
 * Send push to all super_admin users + a specific owner (if provided).
 * Awaits all pushes so they complete before CF Workers kills the request.
 */
export async function pushToAdminsAndOwner(opts: {
  type: string;
  message: string;
  actor_name?: string;
  owner_id?: string | null;
}) {
  try {
    const service = getServiceClient();
    const { data: superAdmins } = await service
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin');
    const targets = (superAdmins ?? []).map(sa => sa.id);
    if (opts.owner_id && !targets.includes(opts.owner_id)) {
      targets.push(opts.owner_id);
    }
    await Promise.allSettled(
      targets.map(uid => sendPushToUser({ user_id: uid, type: opts.type, actor_name: opts.actor_name, message: opts.message }))
    );
  } catch {
    // best-effort
  }
}

function buildPushContent(record: any) {
  const actor = record.actor_name || 'Someone';
  const preview = record.message ? `: "${record.message.slice(0, 60)}"` : '';

  const map: Record<string, { title: string; body: string; url: string; tag: string }> = {
    post_liked: { title: '❤️ Post Liked', body: `${actor} liked your post${preview}`, url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications', tag: `post-liked-${record.post_id || ''}` },
    comment_liked: { title: '💗 Comment Liked', body: `${actor} liked your comment${preview}`, url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications', tag: `comment-liked-${record.comment_id || ''}` },
    post_commented: { title: '💬 New Comment', body: `${actor} commented on your post${preview}`, url: record.post_id ? `/community/board/${record.post_id}` : '/account/notifications', tag: `post-commented-${record.post_id || ''}` },
    friend_request: { title: '👋 Friend Request', body: `${actor} wants to be your friend`, url: '/account/friends', tag: `friend-request-${record.actor_id || ''}` },
    friend_accepted: { title: '🤝 Friend Accepted', body: `${actor} accepted your friend request`, url: '/account/friends', tag: `friend-accepted-${record.actor_id || ''}` },
    new_message: { title: '✉️ New Message', body: `${actor}${preview || ' sent you a message'}`, url: '/account/messages', tag: `message-${record.actor_id || ''}` },
    new_community_post: { title: '📝 New Post', body: `${actor} posted in the community${preview}`, url: record.post_id ? `/community/board/${record.post_id}` : '/community/board', tag: `new-post-${record.post_id || ''}` },
    new_member_signup: { title: '🎉 New Member', body: `${actor} joined the community`, url: '/admin/members', tag: `new-member-${record.actor_id || ''}` },
    new_booking: { title: '📅 New Booking Request', body: `${actor}${preview || ' requested a booking'}`, url: '/admin/bookings', tag: 'new-booking' },
    booking_confirmed: { title: '✅ Booking Confirmed', body: record.message || `Booking confirmed for ${actor}`, url: '/admin/bookings', tag: 'booking-confirmed' },
    booking_cancelled: { title: '❌ Booking Cancelled', body: record.message || `Booking cancelled for ${actor}`, url: '/admin/bookings', tag: 'booking-cancelled' },
    payment_received: { title: '💳 Payment Received', body: record.message || `Payment received from ${actor}`, url: '/admin/bookings', tag: 'payment-received' },
    deposit_received: { title: '💰 Deposit Received', body: record.message || `Deposit received from ${actor}`, url: '/admin/bookings', tag: 'deposit-received' },
  };

  return map[record.type] || { title: 'KefaloniaBNB', body: `New notification`, url: '/account/notifications', tag: 'kefalonia-notification' };
}

async function sendWebPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPub: string,
  vapidPriv: string
): Promise<'ok' | 'expired' | 'error'> {
  const url = new URL(sub.endpoint);
  const aud = `${url.protocol}//${url.hostname}`;
  const jwt = await createJwt(aud, vapidPub, vapidPriv);
  const body = await encrypt(payload, sub.keys.p256dh, sub.keys.auth);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPub}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body,
  });

  if (res.status === 201 || res.status === 200) return 'ok';
  if (res.status === 404 || res.status === 410) return 'expired';
  return 'error';
}

async function createJwt(aud: string, pub: string, priv: string): Promise<string> {
  const h = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const p = b64(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:info@kefaloniabnb.com' }));
  const input = `${h}.${p}`;

  const pubBytes = d64(pub);
  const key = await crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', d: priv, x: b64(pubBytes.slice(1, 33)), y: b64(pubBytes.slice(33, 65)) },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input)));
  return `${h}.${p}.${b64(der2raw(sig))}`;
}

async function encrypt(payload: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(payload);
  const cPub = d64(p256dh), cAuth = d64(auth);

  const sKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sPub = new Uint8Array(await crypto.subtle.exportKey('raw', sKeys.publicKey));
  const cKey = await crypto.subtle.importKey('raw', cPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cKey }, sKeys.privateKey, 256));

  const authInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...cPub, ...sPub]);
  const ikm = await hk(cAuth, shared, authInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hk(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hk(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const padded = new Uint8Array(data.length + 1);
  padded.set(data); padded[data.length] = 2;

  const eKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, eKey, padded));

  const rs = enc.length + 86;
  const hdr = new Uint8Array(86);
  hdr.set(salt); hdr[16]=(rs>>24)&0xff; hdr[17]=(rs>>16)&0xff; hdr[18]=(rs>>8)&0xff; hdr[19]=rs&0xff; hdr[20]=65; hdr.set(sPub,21);

  const out = new Uint8Array(86 + enc.length);
  out.set(hdr); out.set(enc, 86);
  return out;
}

async function hk(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), ikm));
  return new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new Uint8Array([...info, 1]))).slice(0, len);
}

function b64(v: string | Uint8Array): string {
  const b = typeof v === 'string' ? new TextEncoder().encode(v) : v;
  let s = ''; for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function d64(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const p = b.length % 4 === 0 ? '' : '='.repeat(4 - b.length % 4);
  const d = atob(b + p);
  const a = new Uint8Array(d.length);
  for (let i = 0; i < d.length; i++) a[i] = d.charCodeAt(i);
  return a;
}

function der2raw(d: Uint8Array): Uint8Array {
  if (d.length === 64) return d;
  const r = new Uint8Array(64);
  let o = 2;
  const rl = d[o+1]; o += 2;
  r.set(d.slice(rl > 32 ? o+rl-32 : o, o+Math.min(rl,32)), rl < 32 ? 32-rl : 0);
  o += rl;
  const sl = d[o+1]; o += 2;
  r.set(d.slice(sl > 32 ? o+sl-32 : o, o+Math.min(sl,32)), sl < 32 ? 64-sl : 32);
  return r;
}
