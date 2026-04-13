import { getServiceClient } from './supabase.ts';

/**
 * Gamification: points + tiers.
 *
 * Single funnel for all earn events. The DB trigger on user_points_ledger
 * recomputes profiles.points_balance + profiles.tier automatically.
 *
 * One-shot reasons (signup, email_verified, profile_photo, first_favorite,
 * first_booking) have a partial unique index on (user_id, reason) — inserting
 * them twice is a no-op (we swallow the conflict).
 */

export type PointsReason =
  | 'signup'
  | 'email_verified'
  | 'profile_photo'
  | 'first_favorite'
  | 'first_booking'
  | 'booking_completed'
  | 'review_submitted'
  | 'referral_converted'
  | 'daily_streak'
  | 'welcome_reward_used';

export const POINTS: Record<PointsReason, number> = {
  signup: 100,
  email_verified: 50,
  profile_photo: 25,
  first_favorite: 25,
  first_booking: 300,
  booking_completed: 150,
  review_submitted: 150,
  referral_converted: 200,
  daily_streak: 10,
  welcome_reward_used: 50,
};

export type Tier = 'bronze' | 'silver' | 'gold';

export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 250,
  gold: 1000,
};

export function computeTier(points: number): Tier {
  if (points >= TIER_THRESHOLDS.gold) return 'gold';
  if (points >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function pointsToNextTier(points: number): { next: Tier | null; needed: number } {
  if (points < TIER_THRESHOLDS.silver) return { next: 'silver', needed: TIER_THRESHOLDS.silver - points };
  if (points < TIER_THRESHOLDS.gold) return { next: 'gold', needed: TIER_THRESHOLDS.gold - points };
  return { next: null, needed: 0 };
}

export interface AwardResult {
  awarded: boolean;          // false if one-shot reason was already claimed
  delta: number;
  newBalance: number;
  oldTier: Tier;
  newTier: Tier;
  tierChanged: boolean;
}

/**
 * Award (or spend) points. Safe to call multiple times for one-shot reasons.
 * Returns the resulting state so callers can trigger confetti / push on tier-up.
 */
export async function awardPoints(
  userId: string,
  reason: PointsReason,
  opts: { refId?: string; delta?: number } = {},
): Promise<AwardResult> {
  const service = getServiceClient();
  const delta = opts.delta ?? POINTS[reason];

  // Read tier before insert so we can detect tier-ups.
  const { data: before } = await service
    .from('profiles')
    .select('tier, points_balance')
    .eq('id', userId)
    .single();
  const oldTier = (before?.tier ?? 'bronze') as Tier;

  const { error } = await service.from('user_points_ledger').insert({
    user_id: userId,
    delta,
    reason,
    ref_id: opts.refId ?? null,
  });

  // Duplicate one-shot awards violate the partial unique index → swallow.
  // 23505 = unique_violation.
  const awarded = !error;
  if (error && (error as any).code !== '23505') {
    console.error('[points] ledger insert failed', reason, userId, error);
  }

  const { data: after } = await service
    .from('profiles')
    .select('tier, points_balance')
    .eq('id', userId)
    .single();

  const newTier = (after?.tier ?? oldTier) as Tier;
  const newBalance = after?.points_balance ?? before?.points_balance ?? 0;

  return {
    awarded,
    delta: awarded ? delta : 0,
    newBalance,
    oldTier,
    newTier,
    tierChanged: awarded && oldTier !== newTier,
  };
}
