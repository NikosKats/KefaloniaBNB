import { z } from 'zod';

/**
 * Runtime validation for environment variables.
 * Imported lazily by server-side code to fail fast with clear error messages.
 */

const serverSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url('PUBLIC_SUPABASE_URL must be a valid URL'),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_SUBSCRIPTION_PRICE_ID: z.string().optional(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  PUBLIC_FACEBOOK_APP_ID: z.string().optional(),
  PUBLIC_SITE_URL: z.string().url().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let _validated: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (_validated) return _validated;
  const result = serverSchema.safeParse(import.meta.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment variable validation failed:\n${missing}`);
  }
  _validated = result.data;
  return _validated;
}
