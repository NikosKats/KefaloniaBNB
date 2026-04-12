// tests/unit/telegram-routing.test.ts
// Tests for owner-scoped Telegram channel routing logic.
// Uses an in-process simulation of the resolveChannels priority rules —
// no network calls, no Supabase dependency.

import { describe, it, expect } from 'vitest';

// ─── Simulated resolveChannels logic ──────────────────────────────────────────
// Mirrors the priority rules in src/lib/telegram.ts:
//   1. overrideChatId  → use that channel only (per-listing FK override)
//   2. ownerId         → use channels assigned to that owner
//   3. fallback        → global channels (owner_id IS NULL)

interface SimChannel {
  chat_id: string;
  owner_id: string | null;
  notify_booking_new: boolean;
  notify_booking_confirmed: boolean;
  notify_booking_cancelled: boolean;
  is_active: boolean;
}

type NotifyFilter = keyof Pick<SimChannel, 'notify_booking_new' | 'notify_booking_confirmed' | 'notify_booking_cancelled'>;

function resolveChannels(
  db: SimChannel[],
  filter: NotifyFilter,
  overrideChatId?: string | null,
  ownerId?: string | null,
): string[] {
  // Priority 1: explicit per-listing override
  if (overrideChatId) return [overrideChatId];

  const active = db.filter((ch) => ch.is_active && ch[filter]);

  // Priority 2: owner-specific channels
  if (ownerId) {
    const ownerChannels = active.filter((ch) => ch.owner_id === ownerId).map((ch) => ch.chat_id);
    if (ownerChannels.length > 0) return ownerChannels;
  }

  // Priority 3: global channels (owner_id IS NULL)
  return active.filter((ch) => ch.owner_id === null).map((ch) => ch.chat_id);
}

// ─── Fixture DB ───────────────────────────────────────────────────────────────

const DB: SimChannel[] = [
  {
    chat_id: '-100_nikos',
    owner_id: 'owner-nikos',
    notify_booking_new: true,
    notify_booking_confirmed: true,
    notify_booking_cancelled: true,
    is_active: true,
  },
  {
    chat_id: '-100_sofia',
    owner_id: 'owner-sofia',
    notify_booking_new: true,
    notify_booking_confirmed: true,
    notify_booking_cancelled: false,
    is_active: true,
  },
  {
    chat_id: '-100_global',
    owner_id: null,
    notify_booking_new: true,
    notify_booking_confirmed: true,
    notify_booking_cancelled: true,
    is_active: true,
  },
  {
    chat_id: '-100_paused',
    owner_id: null,
    notify_booking_new: true,
    notify_booking_confirmed: true,
    notify_booking_cancelled: true,
    is_active: false,  // paused
  },
];

// ─── Priority 1: explicit override ────────────────────────────────────────────

describe('resolveChannels — priority 1: per-listing override', () => {

  it('uses only the override chat ID, ignoring owner channels', () => {
    const result = resolveChannels(DB, 'notify_booking_new', '-100_override', 'owner-nikos');
    expect(result).toEqual(['-100_override']);
    expect(result).toHaveLength(1);
  });

  it('uses override even when it matches no DB row', () => {
    const result = resolveChannels(DB, 'notify_booking_new', '-100_unknown');
    expect(result).toEqual(['-100_unknown']);
  });

  it('uses override even when owner is null', () => {
    const result = resolveChannels(DB, 'notify_booking_new', '-100_direct', null);
    expect(result).toEqual(['-100_direct']);
  });

});

// ─── Priority 2: owner-specific channels ─────────────────────────────────────

describe('resolveChannels — priority 2: owner channels', () => {

  it('returns Nikos\'s channel for a booking on a Nikos listing', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-nikos');
    expect(result).toEqual(['-100_nikos']);
  });

  it('returns Sofia\'s channel for a booking on a Sofia listing', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-sofia');
    expect(result).toEqual(['-100_sofia']);
  });

  it('does NOT send Nikos\'s notification to Sofia\'s channel', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-nikos');
    expect(result).not.toContain('-100_sofia');
    expect(result).not.toContain('-100_global');
  });

  it('does NOT send Sofia\'s notification to Nikos\'s channel', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-sofia');
    expect(result).not.toContain('-100_nikos');
  });

  it('respects notify filter — Sofia\'s channel has notify_booking_cancelled=false', () => {
    const result = resolveChannels(DB, 'notify_booking_cancelled', null, 'owner-sofia');
    // Sofia's channel doesn't receive cancelled notifications
    expect(result).not.toContain('-100_sofia');
    // Falls back to global
    expect(result).toContain('-100_global');
  });

  it('falls back to global channels when owner has no configured channels', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-unknown');
    expect(result).toEqual(['-100_global']);
  });

  it('paused channels are excluded from owner resolution', () => {
    const dbWithPausedOwner: SimChannel[] = [
      ...DB,
      {
        chat_id: '-100_nikos_paused',
        owner_id: 'owner-nikos',
        notify_booking_new: true,
        notify_booking_confirmed: true,
        notify_booking_cancelled: true,
        is_active: false,
      },
    ];
    const result = resolveChannels(dbWithPausedOwner, 'notify_booking_new', null, 'owner-nikos');
    expect(result).not.toContain('-100_nikos_paused');
    expect(result).toContain('-100_nikos');
  });

});

// ─── Priority 3: global fallback ──────────────────────────────────────────────

describe('resolveChannels — priority 3: global fallback', () => {

  it('uses global channel when no ownerId is provided', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, null);
    expect(result).toContain('-100_global');
  });

  it('does NOT include owner-specific channels in global fallback', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, null);
    expect(result).not.toContain('-100_nikos');
    expect(result).not.toContain('-100_sofia');
  });

  it('excludes paused global channels', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, null);
    expect(result).not.toContain('-100_paused');
  });

  it('returns empty array when no global channels match filter', () => {
    const noGlobal: SimChannel[] = DB.filter((ch) => ch.owner_id !== null);
    const result = resolveChannels(noGlobal, 'notify_booking_new', null, null);
    expect(result).toHaveLength(0);
  });

});

// ─── Multiple owner channels ──────────────────────────────────────────────────

describe('resolveChannels — owner with multiple channels', () => {

  const dbMulti: SimChannel[] = [
    ...DB,
    {
      chat_id: '-100_nikos_2',
      owner_id: 'owner-nikos',
      notify_booking_new: true,
      notify_booking_confirmed: false,
      notify_booking_cancelled: true,
      is_active: true,
    },
  ];

  it('returns all of an owner\'s channels for notify_booking_new', () => {
    const result = resolveChannels(dbMulti, 'notify_booking_new', null, 'owner-nikos');
    expect(result).toContain('-100_nikos');
    expect(result).toContain('-100_nikos_2');
    expect(result).toHaveLength(2);
  });

  it('filters owner channels by notification type', () => {
    // nikos_2 has notify_booking_confirmed=false
    const result = resolveChannels(dbMulti, 'notify_booking_confirmed', null, 'owner-nikos');
    expect(result).toContain('-100_nikos');
    expect(result).not.toContain('-100_nikos_2');
  });

});

// ─── Legacy / backward compat ─────────────────────────────────────────────────

describe('Legacy channel behavior (owner_id = NULL)', () => {

  it('existing channels without owner_id are treated as global', () => {
    // Simulate a pre-migration channel (owner_id = NULL)
    const legacyDb: SimChannel[] = [
      {
        chat_id: '-100_legacy',
        owner_id: null,
        notify_booking_new: true,
        notify_booking_confirmed: true,
        notify_booking_cancelled: true,
        is_active: true,
      },
    ];
    const result = resolveChannels(legacyDb, 'notify_booking_new', null, null);
    expect(result).toEqual(['-100_legacy']);
  });

  it('legacy channel receives booking for listing with no owner', () => {
    const legacyDb: SimChannel[] = [
      {
        chat_id: '-100_legacy',
        owner_id: null,
        notify_booking_new: true,
        notify_booking_confirmed: true,
        notify_booking_cancelled: true,
        is_active: true,
      },
    ];
    // ownerId = null = listing has no owner
    const result = resolveChannels(legacyDb, 'notify_booking_new', null, null);
    expect(result).toContain('-100_legacy');
  });

  it('legacy global channel does NOT receive booking when owner has a dedicated channel', () => {
    const result = resolveChannels(DB, 'notify_booking_new', null, 'owner-nikos');
    // Nikos has a channel, so global should NOT be used
    expect(result).not.toContain('-100_global');
    expect(result).toEqual(['-100_nikos']);
  });

});
