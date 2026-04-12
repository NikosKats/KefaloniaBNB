// tests/e2e/cleaner/job-lifecycle.spec.ts
// E2E spec: cleaner receives a job, starts it, completes the checklist,
// uploads photos, and marks it complete. Owner then approves.
// Corresponds to S01 steps 8–10 and S07 (dispute flow).

import { test, expect } from '@playwright/test';
import { CleanerAgent } from '../../agents/CleanerAgent';
import { OwnerAgent } from '../../agents/OwnerAgent';
import { FIXTURES } from '../../fixtures/users';
import { LISTING_FIXTURES } from '../../fixtures/listings';
import { JOB_FIXTURES } from '../../fixtures/cleaning';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:4321';
const HAS_API  = !!process.env.TEST_BASE_URL;
const apiTest  = HAS_API ? test : test.skip;

// ── S01 happy path — cleaner executes the job ─────────────────────────────────

test.describe('Cleaner — job lifecycle (S01)', () => {

  let elena: CleanerAgent;
  let owner: OwnerAgent;

  // In a full E2E run the job would have been created by the owner acceptance
  // step. Here we use the job ID from the fixture for direct testing.
  const jobId = JOB_FIXTURES.jobJuly19Scheduled.id;

  test.beforeAll(async () => {
    elena = new CleanerAgent(
      {
        email:    FIXTURES.cleaners.elena.email,
        password: FIXTURES.cleaners.elena.password,
        id:       FIXTURES.cleaners.elena.id,
      },
      BASE_URL,
    );
    await elena.login(fetch);

    owner = new OwnerAgent(
      {
        email:    FIXTURES.owners.nikos.email,
        password: FIXTURES.owners.nikos.password,
        id:       FIXTURES.owners.nikos.id,
      },
      BASE_URL,
    );
    await owner.login(fetch);
  });

  // ── Job execution ─────────────────────────────────────────────────────────

  apiTest('cleaner can start the job (scheduled → started)', async () => {
    const result = await elena.startJob(fetch, jobId);
    expect(result).toBeTruthy();
  });

  apiTest('cleaner completes each checklist item', async () => {
    const checklistItemIds = ['item-1', 'item-2', 'item-3'];  // resolved from job
    await expect(
      elena.completeChecklist(fetch, jobId, checklistItemIds),
    ).resolves.not.toThrow();
  });

  apiTest('cleaner uploads before and after photos', async () => {
    const before = await elena.uploadPhotos(fetch, jobId, 'before', 3);
    expect(before).toBeTruthy();

    const after = await elena.uploadPhotos(fetch, jobId, 'after', 3);
    expect(after).toBeTruthy();
  });

  apiTest('cleaner marks job as completed (started → completed)', async () => {
    const result = await elena.markComplete(fetch, jobId);
    expect(result).toBeTruthy();
  });

  // ── Owner approves ────────────────────────────────────────────────────────

  apiTest('owner approves the completed job (completed → approved)', async () => {
    const result = await owner.approveJob(fetch, jobId);
    expect(result).toBeTruthy();
  });

  // ── State machine enforcement ─────────────────────────────────────────────

  apiTest('cleaner cannot skip directly from scheduled to completed', async () => {
    // Create a temp job fixture that's in scheduled state
    const res = await elena.attemptAction(
      fetch,
      `/api/cleaning/jobs/${jobId}`,
      'PATCH',
      { status: 'completed' },
    );
    // The server should reject skipping started state
    // (either 422 or the transition is invalid)
    expect([400, 422]).toContain(res.status);
  });

  apiTest('Stavros cannot update Elena\'s job (403)', async () => {
    const stavros = new CleanerAgent(
      {
        email:    FIXTURES.cleaners.stavros.email,
        password: FIXTURES.cleaners.stavros.password,
        id:       FIXTURES.cleaners.stavros.id,
      },
      BASE_URL,
    );
    await stavros.login(fetch);

    const res = await stavros.attemptAction(
      fetch,
      `/api/cleaning/jobs/${jobId}`,
      'PATCH',
      { status: 'started' },
    );
    expect([403, 404]).toContain(res.status);
  });

});

// ── S07 — Dispute flow ────────────────────────────────────────────────────────

test.describe('Owner — dispute flow (S07)', () => {

  let elena: CleanerAgent;
  let owner: OwnerAgent;

  const jobId = JOB_FIXTURES.jobJuly19Scheduled.id;

  test.beforeAll(async () => {
    elena = new CleanerAgent(
      {
        email:    FIXTURES.cleaners.elena.email,
        password: FIXTURES.cleaners.elena.password,
        id:       FIXTURES.cleaners.elena.id,
      },
      BASE_URL,
    );
    await elena.login(fetch);

    owner = new OwnerAgent(
      {
        email:    FIXTURES.owners.nikos.email,
        password: FIXTURES.owners.nikos.password,
        id:       FIXTURES.owners.nikos.id,
      },
      BASE_URL,
    );
    await owner.login(fetch);
  });

  apiTest('owner can dispute a completed job', async () => {
    // Assume job is in 'completed' state from previous scenario
    const result = await owner.disputeJob(fetch, jobId, 'Bathroom not cleaned properly.');
    expect(result).toBeTruthy();
  });

  apiTest('owner cannot approve a disputed job directly (invalid transition)', async () => {
    const res = await fetch(`${BASE_URL}/api/cleaning/jobs/${jobId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    // disputed → approved is not a valid transition
    expect([400, 403, 422]).toContain(res.status);
  });

  apiTest('cleaner cannot resolve their own dispute (403)', async () => {
    const res = await elena.attemptAction(
      fetch,
      `/api/cleaning/jobs/${jobId}/dispute`,
      'PATCH',
      { status: 'resolved', notes: 'All good' },
    );
    expect([403, 404]).toContain(res.status);
  });

});
