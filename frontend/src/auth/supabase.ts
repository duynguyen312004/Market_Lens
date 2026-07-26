import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function hasRealSupabaseConfiguration() {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabasePublishableKey) &&
    !supabaseUrl?.includes('YOUR_PROJECT_REF') &&
    supabasePublishableKey !== 'sb_publishable_xxx'
  )
}

export const isSupabaseConfigured = hasRealSupabaseConfiguration()

if (import.meta.env.PROD && !isSupabaseConfigured) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required in production.',
  )
}
if (
  import.meta.env.PROD &&
  supabaseUrl &&
  !supabaseUrl.startsWith('https://')
) {
  throw new Error('VITE_SUPABASE_URL must use HTTPS in production.')
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null
