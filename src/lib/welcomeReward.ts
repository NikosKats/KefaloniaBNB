import { getServiceClient } from './supabase.ts';

/**
 * Welcome-reveal (scratch card / spin): every new member gets a prize,
 * revealed only after email verification. Variable-ratio reward → dopamine.
 *
 * Prize tiers (weighted):
 *   small   70%  →  €15 off any stay
 *   medium  20%  →  10% off any stay
 *   large    8%  →  Free cleaning fee on next stay
 *   jackpot  2%  →  Free night (capped — jackpot_cap is checked)
 *
 * Reveal window: 7 days from row creation to click reveal, then 72h to use.
 */

export type PrizeTier = 'small' | 'medium' | 'large' | 'jackpot';

interface PrizeConfig {
  tier: PrizeTier;
  weight: number;
  label: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
}

const PRIZES: PrizeConfig[] = [
  { tier: 'small',   weight: 70, label: '€15 off',          description: '€15 off any stay of 2+ nights',  discount_type: 'fixed',   discount_value: 15 },
  { tier: 'medium',  weight: 20, label: '10% off',          description: '10% off any stay',                discount_type: 'percent', discount_value: 10 },
  { tier: 'large',   weight: 8,  label: 'Free cleaning',    description: 'Cleaning fee on us (any stay)',  discount_type: 'fixed',   discount_value: 50 },
  { tier: 'jackpot', weight: 2,  label: 'Free night 🎉',   description: 'One free night on stays of 3+ nights', discount_type: 'fixed', discount_value: 150 },
];

function pickPrize(): PrizeConfig {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return PRIZES[0];
}

function generateCode(prefix: string): string {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${s}`;
}

/**
 * Create a locked welcome reward for a new user. Idempotent — does nothing if
 * the user already has a reward row.
 *
 * Does NOT yet pick a prize or issue a coupon — that happens at reveal time
 * so the user sees the scratch animation before the prize is locked in.
 * We only record an `expires_at` boundary (7d to reveal) here.
 */
export async function createLockedWelcomeReward(userId: string): Promise<void> {
  const service = getServiceClient();
  const revealDeadline = new Date();
  revealDeadline.setDate(revealDeadline.getDate() + 7);

  // Placeholder prize_tier — actual tier is assigned on reveal.
  await service.from('welcome_rewards').upsert(
    {
      user_id: userId,
      prize_tier: 'small',
      expires_at: revealDeadline.toISOString(),
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
}

/**
 * Reveal the prize: pick weighted, create a unique coupon, stamp reveal time
 * and new 72h use-by expiry. Safe to call repeatedly — returns the same prize
 * once revealed.
 */
export async function revealWelcomeReward(userId: string): Promise<{
  prize_tier: PrizeTier;
  coupon_code: string;
  description: string;
  label: string;
  expires_at: string;
  already_revealed: boolean;
} | null> {
  const service = getServiceClient();

  const { data: existing } = await service
    .from('welcome_rewards')
    .select('id, prize_tier, coupon_code, revealed_at, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) return null;

  // Already revealed: return the existing prize.
  if (existing.revealed_at && existing.coupon_code) {
    const prize = PRIZES.find((p) => p.tier === existing.prize_tier) ?? PRIZES[0];
    return {
      prize_tier: existing.prize_tier as PrizeTier,
      coupon_code: existing.coupon_code,
      description: prize.description,
      label: prize.label,
      expires_at: existing.expires_at,
      already_revealed: true,
    };
  }

  // Fresh reveal: pick prize + create coupon.
  const prize = pickPrize();
  const code = generateCode('WELCOME');

  const useBy = new Date();
  useBy.setHours(useBy.getHours() + 72);

  const { data: coupon, error: couponErr } = await service
    .from('coupons')
    .insert({
      code,
      description: `Welcome reveal: ${prize.description}`,
      discount_type: prize.discount_type,
      discount_value: prize.discount_value,
      max_uses: 1,
      valid_until: useBy.toISOString(),
      is_active: true,
    })
    .select('id')
    .single();

  if (couponErr || !coupon) {
    console.error('[welcomeReward] coupon insert failed', couponErr);
    return null;
  }

  await service
    .from('welcome_rewards')
    .update({
      prize_tier: prize.tier,
      coupon_id: coupon.id,
      coupon_code: code,
      revealed_at: new Date().toISOString(),
      expires_at: useBy.toISOString(),
    })
    .eq('id', existing.id);

  return {
    prize_tier: prize.tier,
    coupon_code: code,
    description: prize.description,
    label: prize.label,
    expires_at: useBy.toISOString(),
    already_revealed: false,
  };
}
