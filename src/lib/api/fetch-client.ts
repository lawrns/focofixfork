/**
 * API Fetch Client
 * Wrapper around fetch that automatically includes credentials for API calls
 */

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Ensure credentials are included for same-origin requests
  // This is critical for Supabase auth cookies to be sent with API requests
  const fetchInit: RequestInit = {
    ...init,
    credentials: 'include',
  }

  return fetch(input, fetchInit)
}
