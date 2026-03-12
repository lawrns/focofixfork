/**
 * API Fetch Client
 * Wrapper around fetch that includes credentials and the active Supabase access token.
 */

import { supabase } from '@/lib/supabase-client'

async function buildAuthHeaders(initHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(initHeaders)

  if (typeof window !== 'undefined') {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  return headers
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = await buildAuthHeaders(init?.headers)
  const fetchInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
  }

  return fetch(input, fetchInit)
}
