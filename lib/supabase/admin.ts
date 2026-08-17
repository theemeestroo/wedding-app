import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for server-only code (cron jobs, webhooks, provisioning).
 * Bypasses RLS — never expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: process.env.NEXT_PUBLIC_APP_SCHEMA! },
    },
  )
}
