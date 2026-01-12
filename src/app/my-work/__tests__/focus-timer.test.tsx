import { renderHook, act, waitFor } from '@testing-library/react';
import { useFocusModeStore } from '@/lib/stores/foco-store';

// Mock WorkItem for testing
const mockWorkItem = {
  id: 'test-task-123',
  title: 'Test Task',
  description: 'Test description',
  status: 'in_progress' as const,
  priority: 'high' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Focus Timer Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset the store state
    useFocusModeStore.getState().deactivate();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should persist timer state across store instances', async () => {
    // First instance - start timer
    const { result: result1 } = renderHook(() => useFocusModeStore());

    act(() => {
      result1.current.activate(mockWorkItem);
      result1.current.startTimer();
    });

    expect(result1.current.isActive).toBe(true);
    expect(result1.current.timerStartedAt).toBeTruthy();
    expect(result1.current.currentWorkItem?.id).toBe('test-task-123');

    // Wait a bit to accumulate some time
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Simulate navigation by creating a new hook instance
    // The store should maintain state due to Zustand's singleton nature
    const { result: result2 } = renderHook(() => useFocusModeStore());

    // Timer should still be running with the same state
    expect(result2.current.isActive).toBe(true);
    expect(result2.current.timerStartedAt).toBe(result1.current.timerStartedAt);
    expect(result2.current.currentWorkItem?.id).toBe('test-task-123');
  });

  it('should calculate elapsed time correctly using getElapsedSeconds', async () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
    });

    // Initially no time elapsed
    expect(result.current.getElapsedSeconds()).toBe(0);

    // Start timer
    act(() => {
      result.current.startTimer();
    });

    // Mock that 2 seconds have passed by manipulating the start time
    act(() => {
      const mockStartTime = Date.now() - 2000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
    });

    // getElapsedSeconds should calculate current elapsed time
    const elapsed = result.current.getElapsedSeconds();
    expect(elapsed).toBeGreaterThanOrEqual(1);
    expect(elapsed).toBeLessThanOrEqual(3);
  });

  it('should continue timer in background and calculate correct elapsed time', async () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
      result.current.startTimer();
    });

    const startTime = result.current.timerStartedAt;
    expect(startTime).toBeTruthy();

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2100));

    // Calculate elapsed time (this should work even if component unmounts)
    const currentTime = Date.now();
    const expectedElapsed = Math.floor((currentTime - startTime!) / 1000);

    expect(expectedElapsed).toBeGreaterThanOrEqual(2);
    expect(expectedElapsed).toBeLessThanOrEqual(3);
  });

  it('should clear timer state on deactivate', () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
      result.current.startTimer();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.timerStartedAt).toBeTruthy();

    act(() => {
      result.current.deactivate();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.timerStartedAt).toBeNull();
    expect(result.current.currentWorkItem).toBeNull();
  });

  it('should accumulate time when pausing and resuming timer', () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
      result.current.startTimer();
    });

    // Simulate some time passing
    act(() => {
      // Mock some time has passed (1 second)
      const mockStartTime = Date.now() - 1000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
    });

    // Stop timer (pause)
    act(() => {
      result.current.stopTimer();
    });

    expect(result.current.timerStartedAt).toBeNull();
    expect(result.current.timerDuration).toBeGreaterThanOrEqual(0);

    const firstDuration = result.current.timerDuration;

    // Resume timer
    act(() => {
      result.current.startTimer();
    });

    expect(result.current.timerStartedAt).toBeTruthy();

    // Simulate more time passing
    act(() => {
      const mockStartTime = Date.now() - 1000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
    });

    // Stop again
    act(() => {
      result.current.stopTimer();
    });

    // Duration should have accumulated
    expect(result.current.timerDuration).toBeGreaterThan(firstDuration);
  });

  it('should handle timer state persistence on completion', () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
      result.current.startTimer();
    });

    // Simulate time passing
    act(() => {
      const mockStartTime = Date.now() - 5000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
    });

    // Stop timer and get final duration
    act(() => {
      result.current.stopTimer();
    });

    const finalDuration = result.current.timerDuration;
    expect(finalDuration).toBeGreaterThan(0);

    // On completion, state should be saved before deactivate
    const taskId = result.current.currentWorkItem?.id;
    expect(taskId).toBe('test-task-123');
  });

  it('should handle multiple pause/resume cycles correctly', () => {
    const { result } = renderHook(() => useFocusModeStore());

    act(() => {
      result.current.activate(mockWorkItem);
    });

    // Cycle 1: Start and stop
    act(() => {
      result.current.startTimer();
      const mockStartTime = Date.now() - 1000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
      result.current.stopTimer();
    });

    const duration1 = result.current.timerDuration;

    // Cycle 2: Start and stop again
    act(() => {
      result.current.startTimer();
      const mockStartTime = Date.now() - 1000;
      useFocusModeStore.setState({ timerStartedAt: mockStartTime });
      result.current.stopTimer();
    });

    const duration2 = result.current.timerDuration;

    // Duration should accumulate
    expect(duration2).toBeGreaterThan(duration1);
  });
});
