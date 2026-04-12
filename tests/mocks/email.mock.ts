import { vi } from 'vitest';

/**
 * Email (Resend) mock. Prevents actual emails being sent during tests.
 *
 * Usage:
 *   vi.mock('../../src/lib/email.ts', () => emailModuleMock)
 */

export const mockSendBookingReceived   = vi.fn();
export const mockSendOwnerAlert        = vi.fn();
export const mockSendCheckinReminder   = vi.fn();
export const mockSendCancellationEmail = vi.fn();

export const emailModuleMock = {
  sendBookingReceived:   mockSendBookingReceived,
  sendOwnerAlert:        mockSendOwnerAlert,
  sendCheckinReminder:   mockSendCheckinReminder,
  sendCancellationEmail: mockSendCancellationEmail,
};

export function resetEmailMocks() {
  vi.clearAllMocks();
  mockSendBookingReceived.mockResolvedValue({ id: 'email-id-123' });
  mockSendOwnerAlert.mockResolvedValue({ id: 'email-id-124' });
  mockSendCheckinReminder.mockResolvedValue({ id: 'email-id-125' });
  mockSendCancellationEmail.mockResolvedValue({ id: 'email-id-126' });
}

/** Mock for the Telegram notification module */
export const mockSendTelegram = vi.fn().mockResolvedValue({ ok: true });
export const telegramModuleMock = {
  sendMessage:            mockSendTelegram,
  getActiveChannels:      vi.fn().mockResolvedValue([]),
  editMessageReplyMarkup: vi.fn().mockResolvedValue({ ok: true }),
  editMessageText:        vi.fn().mockResolvedValue({ ok: true }),
};
