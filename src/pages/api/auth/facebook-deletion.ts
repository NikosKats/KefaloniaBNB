import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import crypto from 'node:crypto';

/**
 * POST /api/auth/facebook-deletion
 * Facebook Data Deletion Callback.
 * Called by Facebook when a user requests deletion of their data.
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export const POST: APIRoute = async ({ request }) => {
  let signedRequest: string;
  try {
    const formData = await request.formData();
    signedRequest = formData.get('signed_request') as string;
  } catch {
    try {
      const body = await request.json();
      signedRequest = body.signed_request;
    } catch {
      return new Response(JSON.stringify({ error: 'Missing signed_request' }), { status: 400 });
    }
  }

  if (!signedRequest) {
    return new Response(JSON.stringify({ error: 'Missing signed_request' }), { status: 400 });
  }

  // Parse the signed request
  const appSecret = import.meta.env.FACEBOOK_APP_SECRET;
  const [encodedSig, payload] = signedRequest.split('.');

  if (!encodedSig || !payload) {
    return new Response(JSON.stringify({ error: 'Invalid signed_request' }), { status: 400 });
  }

  // Decode the data
  const data = JSON.parse(
    Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  );

  const fbUserId = data.user_id;
  if (!fbUserId) {
    return new Response(JSON.stringify({ error: 'No user_id in request' }), { status: 400 });
  }

  // Find and delete the user's data
  const service = getServiceClient();

  // Find profile by facebook_id in user metadata or email pattern
  const { data: profiles } = await service
    .from('profiles')
    .select('id, email')
    .or(`email.eq.fb_${fbUserId}@facebook.local`);

  for (const profile of (profiles ?? [])) {
    // Delete community posts
    await service.from('community_posts').delete().eq('author_id', profile.id);
    await service.from('community_comments').delete().eq('author_id', profile.id);
    await service.from('community_likes').delete().eq('user_id', profile.id);

    // Delete auth user (cascades to profile)
    await service.auth.admin.deleteUser(profile.id);
  }

  // Generate a confirmation code and status URL
  const confirmationCode = crypto.randomUUID();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://kefaloniabnb.com';

  return new Response(JSON.stringify({
    url: `${siteUrl}/api/auth/facebook-deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * GET /api/auth/facebook-deletion?code=...
 * Status check page for data deletion.
 */
export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  return new Response(
    `<!DOCTYPE html><html><head><title>Data Deletion</title></head>
    <body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center;">
      <h2>Data Deletion Request</h2>
      <p>Your data has been deleted from KefaloniaBNB.</p>
      ${code ? `<p style="color:#666;font-size:13px;">Confirmation code: ${code}</p>` : ''}
      <p style="color:#999;font-size:12px;margin-top:24px;">If you have questions, contact us at info@kefaloniabnb.com</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
};
