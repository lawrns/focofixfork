import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  supabase: SupabaseClient
  error: string | null
}

/**
 * Get authenticated user from request
 * Creates Supabase client with user's cookies
 */
export async function getAuthUser(req: NextRequest): Promise<AuthResult> {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Get auth token from cookie
  const authToken = cookieStore.get('sb-access-token')?.value || 
                    cookieStore.get('sb-ouvqnyfqipgnrjnuqsqq-auth-token')?.value
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authToken ? {
        Authorization: `Bearer ${authToken}`
      } : {}
    }
  })
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized' }
  }
  
  return { user, supabase, error: null }
}
