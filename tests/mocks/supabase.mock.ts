import { vi } from 'vitest';

/**
 * Minimal Supabase client mock. Use `mockSupabaseSelect` and friends to shape
 * what the fake client returns in each test.
 *
 * Usage:
 *   vi.mock('../../src/lib/supabase.ts', () => ({ getServiceClient: () => mockSupabase }))
 *   mockSupabaseSelect.mockResolvedValueOnce({ data: [...], error: null })
 */

export const mockSupabaseSelect   = vi.fn();
export const mockSupabaseInsert   = vi.fn();
export const mockSupabaseUpdate   = vi.fn();
export const mockSupabaseDelete   = vi.fn();
export const mockSupabaseRpc      = vi.fn();
export const mockSupabaseSingle   = vi.fn();
export const mockSupabaseMaybeSingle = vi.fn();

function chainable(terminal: ReturnType<typeof vi.fn>) {
  const proxy: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'not', 'like', 'ilike', 'contains',
    'order', 'limit', 'range', 'match',
    'single', 'maybeSingle',
  ];

  for (const method of methods) {
    if (method === 'single') {
      proxy[method] = mockSupabaseSingle;
    } else if (method === 'maybeSingle') {
      proxy[method] = mockSupabaseMaybeSingle;
    } else {
      proxy[method] = () => ({
        ...proxy,
        then: terminal.then?.bind(terminal),
        [Symbol.toStringTag]: 'Promise',
      });
    }
  }

  // Make the chain thenable (so `await table.select(...)` works)
  proxy.then   = terminal.then?.bind(terminal);
  proxy.catch  = terminal.catch?.bind(terminal);
  proxy.finally = terminal.finally?.bind(terminal);

  return proxy;
}

/** Pre-built mock that resolves with { data: null, error: null } by default */
export function makeSupabaseMock() {
  const defaultResponse = Promise.resolve({ data: null, error: null });

  const fromFn = vi.fn((_table: string) => ({
    select:  (..._a: unknown[]) => ({ ...chainable(mockSupabaseSelect), [Symbol.toStringTag]: 'Promise' }),
    insert:  (..._a: unknown[]) => ({ ...chainable(mockSupabaseInsert), [Symbol.toStringTag]: 'Promise' }),
    update:  (..._a: unknown[]) => ({ ...chainable(mockSupabaseUpdate), [Symbol.toStringTag]: 'Promise' }),
    delete:  (..._a: unknown[]) => ({ ...chainable(mockSupabaseDelete), [Symbol.toStringTag]: 'Promise' }),
  }));

  return {
    from:  fromFn,
    rpc:   mockSupabaseRpc,
    auth:  {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut:            vi.fn().mockResolvedValue({ error: null }),
      getUser:            vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
}

export const mockSupabase = makeSupabaseMock();

/** Reset all mocks between tests */
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
  mockSupabaseInsert.mockResolvedValue({ data: null, error: null });
  mockSupabaseUpdate.mockResolvedValue({ data: null, error: null });
  mockSupabaseDelete.mockResolvedValue({ data: null, error: null });
  mockSupabaseRpc.mockResolvedValue({ data: null, error: null });
  mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
  mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
}
