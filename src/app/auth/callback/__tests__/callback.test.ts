import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
  })),
}));

describe('OAuth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /auth/callback', () => {
    it('exchanges OAuth code for session and redirects to specified URL', async () => {
      const { createServerClient } = await import('@supabase/ssr');

      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'user-123', email: 'test@example.com' },
          },
        },
        error: null,
      });

      (createServerClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      });

      const url = new URL('http://localhost:3000/auth/callback');
      url.searchParams.set('code', 'oauth-code-123');
      url.searchParams.set('redirectTo', '/dashboard/personalized');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(mockExchangeCode).toHaveBeenCalledWith('oauth-code-123');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/dashboard/personalized');
    });

    it('redirects to home page when no redirectTo parameter is provided', async () => {
      const { createServerClient } = await import('@supabase/ssr');

      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'user-123', email: 'test@example.com' },
          },
        },
        error: null,
      });

      (createServerClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      });

      const url = new URL('http://localhost:3000/auth/callback');
      url.searchParams.set('code', 'oauth-code-123');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(mockExchangeCode).toHaveBeenCalledWith('oauth-code-123');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/');
    });

    it('returns error when no code parameter is provided', async () => {
      const url = new URL('http://localhost:3000/auth/callback');
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No code provided');
    });

    it('returns error when code exchange fails', async () => {
      const { createServerClient } = await import('@supabase/ssr');

      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' },
      });

      (createServerClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      });

      const url = new URL('http://localhost:3000/auth/callback');
      url.searchParams.set('code', 'invalid-code');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/login');
      expect(response.headers.get('location')).toContain('error=');
    });

    it('handles URL-encoded redirectTo parameter correctly', async () => {
      const { createServerClient } = await import('@supabase/ssr');

      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'user-123', email: 'test@example.com' },
          },
        },
        error: null,
      });

      (createServerClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      });

      const redirectPath = '/dashboard/projects?id=123';
      const url = new URL('http://localhost:3000/auth/callback');
      url.searchParams.set('code', 'oauth-code-123');
      url.searchParams.set('redirectTo', encodeURIComponent(redirectPath));

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(redirectPath);
    });

    it('sets cookies properly through Supabase client', async () => {
      const { createServerClient } = await import('@supabase/ssr');

      let capturedCookieHandlers: any = null;

      (createServerClient as any).mockImplementation(
        (url: string, key: string, options: any) => {
          capturedCookieHandlers = options.cookies;
          return {
            auth: {
              exchangeCodeForSession: vi.fn().mockResolvedValue({
                data: {
                  session: {
                    access_token: 'mock-token',
                    user: { id: 'user-123', email: 'test@example.com' },
                  },
                },
                error: null,
              }),
            },
          };
        }
      );

      const url = new URL('http://localhost:3000/auth/callback');
      url.searchParams.set('code', 'oauth-code-123');
      url.searchParams.set('redirectTo', '/dashboard/personalized');

      const request = new NextRequest(url);
      await GET(request);

      expect(capturedCookieHandlers).toBeDefined();
      expect(capturedCookieHandlers.getAll).toBeDefined();
      expect(capturedCookieHandlers.setAll).toBeDefined();
    });
  });
});
