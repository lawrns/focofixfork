import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InboxPage from '../page';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

// Mock dependencies BEFORE imports that use them
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('InboxPage - Null Safety', () => {
  const mockUser = { id: '1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  describe('API Response Null Handling', () => {
    it('should not crash when API returns null data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      const { container } = render(<InboxPage />);

      // Should not crash and eventually show empty state
      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });

    it('should not crash when API returns undefined data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: undefined }),
      });

      const { container } = render(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
    });

    it('should not crash when API returns success: false with null data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, data: null }),
      });

      const { container } = render(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
    });

    it('should show empty state when data is null', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when data is undefined', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: undefined }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when data is empty array', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should not crash when fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('Failed to load inbox');
    });

    it('should not crash when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Server error' }),
      });

      const { container } = render(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { container } = render(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading your messages/i)).not.toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('Failed to load inbox');
    });
  });

  describe('Data Validation', () => {
    it('should handle non-array data gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { not: 'an array' } }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });
    });

    it('should handle primitive data types', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'string' }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });
    });

    it('should render valid data correctly', async () => {
      const validData = [
        {
          id: '1',
          type: 'mention',
          title: 'Test notification',
          body: 'Test body',
          actor: { full_name: 'John Doe' },
          is_read: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: validData }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
        expect(screen.getByText(/1 notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Authentication', () => {
    it('should not fetch when user is not authenticated', async () => {
      (useAuth as any).mockReturnValue({ user: null });

      render(<InboxPage />);

      // When no user, should not be loading
      await waitFor(() => {
        const loadingText = screen.queryByText(/Loading your messages/i);
        // Loading state should eventually disappear
        expect(loadingText).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should maintain empty items state after null response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });

      // Verify unread count is 0 - use getAllByText since it appears twice
      const caughtUpElements = screen.getAllByText(/all caught up/i);
      expect(caughtUpElements.length).toBeGreaterThan(0);
    });

    it('should handle filtering on empty data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });

      // Should be able to interact with tabs without crashing
      const unreadTab = screen.getByRole('tab', { name: /Unread/i });
      expect(unreadTab).toBeInTheDocument();
    });
  });
});
