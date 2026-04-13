import type { APIRoute } from 'astro';
import { revealWelcomeReward } from '../../../lib/welcomeReward.ts';

const J = { 'Content-Type': 'application/json' };

/**
 * POST /api/rewards/reveal — reveal the authenticated user's welcome prize.
 * Idempotent: repeat calls return the same prize.
 */
export const POST: APIRoute = async ({ locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: J });
  }
  const userId = locals.session.user.id;

  // Require a confirmed email for the reveal — creates the dopamine gate.
  const emailConfirmed = !!locals.session.user.email_confirmed_at;
  if (!emailConfirmed) {
    return new Response(JSON.stringify({ error: 'email_not_confirmed' }), { status: 403, headers: J });
  }

  const result = await revealWelcomeReward(userId);
  if (!result) {
    return new Response(JSON.stringify({ error: 'no_reward' }), { status: 404, headers: J });
  }

  return new Response(JSON.stringify({ ok: true, reward: result }), { status: 200, headers: J });
};
