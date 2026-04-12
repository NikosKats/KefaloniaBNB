// tests/agents/types.ts
// Shared types for scripted test agents.

export type AgentAction =
  | 'browse_listings'
  | 'view_listing'
  | 'create_booking_card'
  | 'create_booking_bank'
  | 'submit_listing'
  | 'edit_listing'
  | 'create_cleaning_request'
  | 'view_bids'
  | 'accept_bid'
  | 'approve_job'
  | 'dispute_job'
  | 'submit_bid'
  | 'start_job'
  | 'upload_photos'
  | 'complete_checklist'
  | 'mark_job_complete'
  | 'activate_listing'
  | 'activate_cleaner'
  | 'mark_booking_paid'
  | 'mark_payout_manual'
  | 'resolve_dispute'
  | 'approve_stale_job';

export interface AgentState {
  lastAction: AgentAction | null;
  lastResult: unknown;
  errors: string[];
}

export interface AgentResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/** Parse a fetch response, throw on non-ok with body included in message */
export async function parseResponse<T = unknown>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable body)');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
