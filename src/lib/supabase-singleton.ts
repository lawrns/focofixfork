import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let clientInstance: ReturnType<typeof createClient<Database>> | null = null
let serverInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    clientInstance = createClient<Database>(url, key)
  }
  return clientInstance
}

export function getSupabaseServer() {
  if (!serverInstance && typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    serverInstance = createClient<Database>(url, key)
  }
  return serverInstance!
}
