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

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null
