import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/lib/contexts/auth-context';
import { createMockUser, mockSupabaseResponse } from '../setup';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Test component that uses auth context
function TestAuthComponent() {
  const { user, login, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div>
        <button onClick={() => login('test@example.com', 'password')}>
          Login
        </button>
        <p>Not logged in</p>
      </div>
    );
  }

  return (
    <div>
      <p>Logged in as: {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth state
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(null));
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Mock subscription
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('renders loading state initially', async () => {
    mockSupabase.auth.getUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  it('handles successful login flow', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();

    // Mock initial unauthenticated state
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(null));

    // Mock successful login
    mockSupabase.auth.signInWithPassword.mockResolvedValue(
      mockSupabaseResponse({
        user: mockUser,
        session: { access_token: 'token', refresh_token: 'refresh' },
      })
    );

    // Mock auth state change
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Simulate auth state change after login
      setTimeout(() => callback('SIGNED_IN', mockSupabaseResponse({
        user: mockUser,
        session: { access_token: 'token' },
      })), 10);

      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Click login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    // Should show logged in state
    await waitFor(() => {
      expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles login failure', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock login failure
    mockSupabase.auth.signInWithPassword.mockRejectedValue(
      new Error('Invalid credentials')
    );

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Click login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    // Should remain logged out and show error
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles logout flow', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();

    // Mock authenticated initial state
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(mockUser));
    mockSupabase.auth.signOut.mockResolvedValue(mockSupabaseResponse(null));

    // Mock auth state change for logout
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Simulate auth state change after logout
      setTimeout(() => callback('SIGNED_OUT', null), 10);

      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should show logged in state
    await waitFor(() => {
      expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    // Should show logged out state
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('handles auth state changes from external events', async () => {
    const mockUser = createMockUser();
    let authCallback: any;

    // Mock auth state change listener
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Start with unauthenticated state
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(null));

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Simulate external login (e.g., from another tab)
    authCallback('SIGNED_IN', mockSupabaseResponse({
      user: mockUser,
      session: { access_token: 'token' },
    }));

    // Should update to logged in state
    await waitFor(() => {
      expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
    });
  });

  it('persists auth state across re-renders', async () => {
    const mockUser = createMockUser();

    // Mock authenticated state
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(mockUser));

    const { rerender } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should show logged in state
    await waitFor(() => {
      expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
    });

    // Re-render component
    rerender(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should still be logged in
    expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock network error
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));
    mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should handle initial load error
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Try login with network error
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    // Should remain in logged out state
    expect(screen.getByText('Not logged in')).toBeInTheDocument();

    expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
