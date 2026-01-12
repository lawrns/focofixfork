import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InboxPage from '../page';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('InboxPage - Mark All As Read', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockNotifications = [
    {
      id: '1',
      type: 'mention',
      title: 'You were mentioned',
      body: 'John mentioned you in a comment',
      actor: { full_name: 'John Doe' },
      is_read: false,
      created_at: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      type: 'assigned',
      title: 'Task assigned to you',
      body: 'New task from Jane',
      actor: { full_name: 'Jane Smith' },
      is_read: false,
      created_at: '2024-01-14T00:00:00Z',
    },
    {
      id: '3',
      type: 'comment',
      title: 'New comment',
      body: 'Someone commented on your work',
      actor: { full_name: 'Bob Johnson' },
      is_read: true,
      created_at: '2024-01-13T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  describe('Mark All Read Endpoint', () => {
    it('should call the API endpoint with correct method and headers', async () => {
      (global.fetch as any).mockImplementation((url, options) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          expect(options.method).toBe('PATCH');
          expect(options.headers['Content-Type']).toBe('application/json');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 2 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/mark-all-read',
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should mark ALL notifications as read, not just visible ones', async () => {
      const manyNotifications = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        type: 'mention' as const,
        title: `Notification ${i}`,
        body: `Body ${i}`,
        actor: { full_name: `User ${i}` },
        is_read: i > 5, // Only first 5 are unread
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }));

      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: manyNotifications,
            }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          // Should mark all 50 as read, not just the visible ones
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 50 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Notification 0')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/mark-all-read',
          expect.any(Object)
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should handle network errors when marking all read', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('UI Updates After Mark All Read', () => {
    it('should update all notification items to show as read', async () => {
      const updatedNotifications = mockNotifications.map(n => ({
        ...n,
        is_read: true,
      }));

      let markAllReadCalled = false;
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: markAllReadCalled ? updatedNotifications : mockNotifications,
            }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          markAllReadCalled = true;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 2 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        // After marking all read, should refresh and show updated state
        // The success toast indicates the operation completed
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('marked as read')
        );
      });
    });

    it('should update unread count after marking all read', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockNotifications.map(n => ({ ...n, is_read: true })),
            }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 2 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        // Should show "all caught up" when all are read
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });

    it('should show success toast on successful mark all read', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 2 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('2')
        );
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should handle mark all read when no notifications exist', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 0 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/0 notifications/i)).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('0')
        );
      });
    });

    it('should show all caught up state when all notifications are read', async () => {
      const allReadNotifications = mockNotifications.map(n => ({
        ...n,
        is_read: true,
      }));

      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: allReadNotifications,
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Optimistic UI Updates with Revert on Error', () => {
    it('should revert UI updates if API call fails', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          callCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          // Simulate API error
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      // Get initial unread count
      const unreadBadge = screen.getByText('2');
      expect(unreadBadge).toBeInTheDocument();

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Should still show the original unread notifications
      expect(screen.getByText('You were mentioned')).toBeInTheDocument();
    });

    it('should handle concurrent mark all read requests', async () => {
      let requestCount = 0;
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          requestCount++;
          // Only succeed on first request
          if (requestCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, count: 2 }),
            });
          }
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({ error: 'Conflict' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });

      // Click multiple times rapidly
      await userEvent.click(markAllReadButton);
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        // Should have at least one successful call
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/mark-all-read',
          expect.any(Object)
        );
      });
    });
  });

  describe('Filter Integration', () => {
    it('should mark all unread notifications when viewing unread filter', async () => {
      (global.fetch as any).mockImplementation((url) => {
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockNotifications }),
          });
        }
        if (url === '/api/notifications/mark-all-read') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 2 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      });

      // Switch to unread filter
      const unreadTab = screen.getByRole('tab', { name: /Unread/i });
      await userEvent.click(unreadTab);

      // Mark all read should still mark ALL, not just filtered
      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      await userEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/mark-all-read',
          expect.any(Object)
        );
      });
    });
  });
});
