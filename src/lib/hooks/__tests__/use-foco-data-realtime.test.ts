import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkItems, useWorkItem } from '../use-foco-data';

// Mock the supabase client
vi.mock('@/lib/supabase-client', () => {
  let channelCallback: any = null;
  let channelConfig: any = null;

  const mockChannel = {
    on: vi.fn((event: string, config: any, callback: any) => {
      channelCallback = callback;
      channelConfig = config;
      return mockChannel;
    }),
    subscribe: vi.fn(() => {
      return mockChannel;
    }),
  };

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn((channelName: string) => mockChannel),
    removeChannel: vi.fn(),
  };

  // Expose the channel config for testing
  (supabase as any).__getLastChannelConfig = () => channelConfig;

  return { supabase };
});

// Mock stores
vi.mock('@/lib/stores/foco-store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentWorkspace: null,
    setCurrentWorkspace: vi.fn(),
  })),
  useInboxStore: vi.fn(() => ({
    items: [],
    setItems: vi.fn(),
  })),
}));

describe('useWorkItems real-time subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to the correct table name "work_items"', async () => {
    const { supabase } = await import('@/lib/supabase-client');

    // Render the hook
    renderHook(() => useWorkItems());

    // Wait for the subscription to be set up
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    // Get the channel configuration
    const channelConfig = (supabase as any).__getLastChannelConfig();

    // Verify the subscription is listening to 'work_items' table
    expect(channelConfig).toBeDefined();
    expect(channelConfig.table).toBe('work_items');
  });

  it('should subscribe to the correct schema and event type', async () => {
    const { supabase } = await import('@/lib/supabase-client');

    renderHook(() => useWorkItems());

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    const channelConfig = (supabase as any).__getLastChannelConfig();

    expect(channelConfig.schema).toBe('public');
    expect(channelConfig.event).toBe('*');
  });

  it('should filter by workspace_id in subscription', async () => {
    const { supabase } = await import('@/lib/supabase-client');

    renderHook(() => useWorkItems({ workspaceId: 'test-workspace-id' }));

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    const channelConfig = (supabase as any).__getLastChannelConfig();

    expect(channelConfig.filter).toContain('workspace_id=eq.');
  });
});

describe('useWorkItem real-time subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to the correct table name "work_items" for single work item', async () => {
    const { supabase } = await import('@/lib/supabase-client');

    renderHook(() => useWorkItem('test-item-id'));

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    const channelConfig = (supabase as any).__getLastChannelConfig();

    // Verify the subscription is listening to 'work_items' table
    expect(channelConfig).toBeDefined();
    expect(channelConfig.table).toBe('work_items');
  });

  it('should filter by work item id in subscription', async () => {
    const { supabase } = await import('@/lib/supabase-client');

    const testId = 'test-work-item-123';
    renderHook(() => useWorkItem(testId));

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    const channelConfig = (supabase as any).__getLastChannelConfig();

    expect(channelConfig.filter).toBe(`id=eq.${testId}`);
  });
});
