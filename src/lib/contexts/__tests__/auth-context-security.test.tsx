/**
 * CRITICAL SECURITY TEST: Auth Context Token Storage
 *
 * This test ensures that authentication tokens are NEVER stored in localStorage,
 * which would expose them to XSS attacks. All token storage MUST use HTTP-only
 * cookies managed by Supabase.
 *
 * XSS Vulnerability: localStorage is accessible to any JavaScript code, including
 * malicious scripts injected via XSS. HTTP-only cookies cannot be accessed by
 * JavaScript, providing protection against token theft.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

describe('Auth Context Security - Token Storage', () => {
  const authContextPath = join(process.cwd(), 'src/lib/contexts/auth-context.tsx')
  let authContextSource: string

  beforeAll(() => {
    authContextSource = readFileSync(authContextPath, 'utf-8')
  })

  it('CRITICAL: should NOT use localStorage.getItem() for token storage', () => {
    // Check for any localStorage.getItem calls that might be token-related
    const getItemMatches = authContextSource.match(/localStorage\.getItem\([^)]*token[^)]*\)/gi)

    expect(getItemMatches).toBeNull()

    if (getItemMatches) {
      console.error('SECURITY VIOLATION: Found localStorage.getItem() with token:', getItemMatches)
    }
  })

  it('CRITICAL: should NOT use localStorage.setItem() for token storage', () => {
    // Check for any localStorage.setItem calls that might be token-related
    const setItemMatches = authContextSource.match(/localStorage\.setItem\([^)]*token[^)]*\)/gi)

    expect(setItemMatches).toBeNull()

    if (setItemMatches) {
      console.error('SECURITY VIOLATION: Found localStorage.setItem() with token:', setItemMatches)
    }
  })

  it('CRITICAL: should NOT use localStorage.removeItem() for token storage', () => {
    // Check for any localStorage.removeItem calls that might be token-related
    const removeItemMatches = authContextSource.match(/localStorage\.removeItem\([^)]*token[^)]*\)/gi)

    expect(removeItemMatches).toBeNull()

    if (removeItemMatches) {
      console.error('SECURITY VIOLATION: Found localStorage.removeItem() with token:', removeItemMatches)
    }
  })

  it('should contain security documentation about cookie-based auth', () => {
    // Ensure there's documentation explaining the security approach
    const hasSecurityComment =
      authContextSource.includes('HTTP-only') ||
      authContextSource.includes('cookie') ||
      authContextSource.includes('XSS')

    expect(hasSecurityComment).toBe(true)
  })

  it('should rely on Supabase client for session management', () => {
    // Verify that the code uses Supabase's built-in session management
    const usesSupabaseSession = authContextSource.includes('supabase.auth.getSession')
    const usesSupabaseRefresh = authContextSource.includes('supabase.auth.refreshSession')

    expect(usesSupabaseSession).toBe(true)
    expect(usesSupabaseRefresh).toBe(true)
  })
})
