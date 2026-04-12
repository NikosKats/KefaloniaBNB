// tests/agents/CleanerAgent.ts
// Scripted cleaner agent — browses requests, bids, executes jobs, uploads photos.

import type { AgentState } from './types';
import { parseResponse } from './types';

export class CleanerAgent {
  readonly role = 'cleaner' as const;
  state: AgentState = { lastAction: null, lastResult: null, errors: [] };
  private authCookie: string | null = null;

  constructor(
    private readonly cleaner: { email: string; password: string; id: string },
    private readonly baseUrl: string,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(fetch: typeof globalThis.fetch): Promise<void> {
    const body = new FormData();
    body.append('email', this.cleaner.email);
    body.append('password', this.cleaner.password);

    const res = await fetch(`${this.baseUrl}/api/auth/cleaner-login`, {
      method:   'POST',
      body,
      redirect: 'manual',
    });
    this.authCookie = res.headers.get('set-cookie');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.authCookie ? { Cookie: this.authCookie } : {}),
    };
  }

  // ── Browsing ──────────────────────────────────────────────────────────────

  async browseOpenRequests(fetch: typeof globalThis.fetch) {
    const res = await fetch(
      `${this.baseUrl}/api/cleaning/requests/open`,
      { headers: this.headers },
    );
    return parseResponse<Array<Record<string, unknown>>>(res);
  }

  // ── Bidding ───────────────────────────────────────────────────────────────

  async submitBid(
    fetch: typeof globalThis.fetch,
    requestId: string,
    bid: { price: number; time?: string; message?: string },
  ): Promise<{ id: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/cleaning/requests/${requestId}/bids`,
      {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          request_id:     requestId,
          proposed_price: bid.price,
          proposed_time:  bid.time,
          message:        bid.message,
        }),
      },
    );
    const data = await parseResponse<{ id: string }>(res);
    this.state.lastAction = 'submit_bid';
    this.state.lastResult = data;
    return data;
  }

  // ── Job execution ─────────────────────────────────────────────────────────

  async startJob(fetch: typeof globalThis.fetch, jobId: string) {
    const res = await fetch(`${this.baseUrl}/api/cleaning/jobs/${jobId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ status: 'started' }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'start_job';
    this.state.lastResult = data;
    return data;
  }

  /** Tick every checklist item as done */
  async completeChecklist(
    fetch: typeof globalThis.fetch,
    jobId: string,
    itemIds: string[],
  ): Promise<void> {
    for (const itemId of itemIds) {
      await fetch(
        `${this.baseUrl}/api/cleaning/jobs/${jobId}/checklist/${itemId}`,
        {
          method:  'PATCH',
          headers: this.headers,
          body:    JSON.stringify({ is_done: true }),
        },
      );
    }
    this.state.lastAction = 'complete_checklist';
  }

  /**
   * Upload photos for a job phase.
   * In tests, photos are represented as synthetic storage URLs — no real file upload needed.
   */
  async uploadPhotos(
    fetch: typeof globalThis.fetch,
    jobId: string,
    phase: 'before' | 'after',
    count: number,
  ) {
    const photos = Array.from({ length: count }, (_, i) => ({
      job_id: jobId,
      phase,
      url:    `https://storage.test/jobs/${jobId}/${phase}_${String(i + 1).padStart(2, '0')}.jpg`,
    }));

    const res = await fetch(`${this.baseUrl}/api/cleaning/jobs/${jobId}/photos`, {
      method:  'POST',
      headers: this.headers,
      body:    JSON.stringify({ photos }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'upload_photos';
    this.state.lastResult = data;
    return data;
  }

  async markComplete(fetch: typeof globalThis.fetch, jobId: string) {
    const res = await fetch(`${this.baseUrl}/api/cleaning/jobs/${jobId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ status: 'completed' }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'mark_job_complete';
    this.state.lastResult = data;
    return data;
  }

  /** Attempt an action that should fail — returns the raw Response */
  async attemptAction(
    fetch: typeof globalThis.fetch,
    url: string,
    method = 'GET',
    body?: unknown,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method,
      headers: this.headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
}
