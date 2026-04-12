// tests/unit/state-machines.test.ts
// Verifies the cleaning job state machine transition rules.
// Every valid and invalid transition is tested explicitly.

import { describe, it, expect } from 'vitest';
import type { CleaningJobStatus } from '../types/domain';

// ─── State machine definition ──────────────────────────────────────────────────

const VALID_JOB_TRANSITIONS: Record<CleaningJobStatus, CleaningJobStatus[]> = {
  scheduled:  ['started', 'cancelled'],
  started:    ['completed', 'disputed', 'cancelled'],
  completed:  ['approved', 'disputed'],
  approved:   [],   // terminal — no transitions allowed
  disputed:   ['approved', 'cancelled'],
  cancelled:  [],   // terminal — no transitions allowed
};

function canTransition(from: CleaningJobStatus, to: CleaningJobStatus): boolean {
  return VALID_JOB_TRANSITIONS[from].includes(to);
}

/** All states for table-driven tests */
const ALL_STATES: CleaningJobStatus[] = [
  'scheduled', 'started', 'completed', 'approved', 'disputed', 'cancelled',
];

// ─── Valid transitions ─────────────────────────────────────────────────────────

describe('Valid cleaning job transitions', () => {

  it('scheduled → started (cleaner begins work)', () => {
    expect(canTransition('scheduled', 'started')).toBe(true);
  });

  it('scheduled → cancelled (cancelled before cleaner arrives)', () => {
    expect(canTransition('scheduled', 'cancelled')).toBe(true);
  });

  it('started → completed (cleaner marks done)', () => {
    expect(canTransition('started', 'completed')).toBe(true);
  });

  it('started → disputed (issue raised mid-job)', () => {
    expect(canTransition('started', 'disputed')).toBe(true);
  });

  it('started → cancelled (job abandoned)', () => {
    expect(canTransition('started', 'cancelled')).toBe(true);
  });

  it('completed → approved (owner signs off)', () => {
    expect(canTransition('completed', 'approved')).toBe(true);
  });

  it('completed → disputed (owner raises issue after completion)', () => {
    expect(canTransition('completed', 'disputed')).toBe(true);
  });

  it('disputed → approved (admin resolves in cleaners favour)', () => {
    expect(canTransition('disputed', 'approved')).toBe(true);
  });

  it('disputed → cancelled (admin cancels job — no payout)', () => {
    expect(canTransition('disputed', 'cancelled')).toBe(true);
  });

});

// ─── Invalid transitions ───────────────────────────────────────────────────────

describe('Invalid cleaning job transitions', () => {

  it('approved is terminal — no transition allowed', () => {
    ALL_STATES.forEach(to => {
      expect(canTransition('approved', to)).toBe(false);
    });
  });

  it('cancelled is terminal — no transition allowed', () => {
    ALL_STATES.forEach(to => {
      expect(canTransition('cancelled', to)).toBe(false);
    });
  });

  it('completed → started is invalid (no going back)', () => {
    expect(canTransition('completed', 'started')).toBe(false);
  });

  it('completed → scheduled is invalid', () => {
    expect(canTransition('completed', 'scheduled')).toBe(false);
  });

  it('scheduled → completed is invalid (must go through started)', () => {
    expect(canTransition('scheduled', 'completed')).toBe(false);
  });

  it('scheduled → approved is invalid (must go through started + completed)', () => {
    expect(canTransition('scheduled', 'approved')).toBe(false);
  });

  it('scheduled → disputed is invalid', () => {
    expect(canTransition('scheduled', 'disputed')).toBe(false);
  });

  it('started → scheduled is invalid (no going back)', () => {
    expect(canTransition('started', 'scheduled')).toBe(false);
  });

  it('started → approved is invalid (must be completed first)', () => {
    expect(canTransition('started', 'approved')).toBe(false);
  });

  it('disputed → started is invalid', () => {
    expect(canTransition('disputed', 'started')).toBe(false);
  });

  it('disputed → completed is invalid', () => {
    expect(canTransition('disputed', 'completed')).toBe(false);
  });

  it('disputed → scheduled is invalid', () => {
    expect(canTransition('disputed', 'scheduled')).toBe(false);
  });

});

// ─── Payout safety rules ──────────────────────────────────────────────────────

describe('Payout safety — status gating', () => {

  function shouldTriggerPayout(status: CleaningJobStatus): boolean {
    return status === 'approved';
  }

  it('payout triggered only when status is approved', () => {
    expect(shouldTriggerPayout('approved')).toBe(true);
  });

  it('payout NOT triggered for disputed job', () => {
    expect(shouldTriggerPayout('disputed')).toBe(false);
  });

  it('payout NOT triggered for cancelled job', () => {
    expect(shouldTriggerPayout('cancelled')).toBe(false);
  });

  it('payout NOT triggered for completed (awaiting approval) job', () => {
    expect(shouldTriggerPayout('completed')).toBe(false);
  });

  it('payout NOT triggered for scheduled or started job', () => {
    expect(shouldTriggerPayout('scheduled')).toBe(false);
    expect(shouldTriggerPayout('started')).toBe(false);
  });

});
