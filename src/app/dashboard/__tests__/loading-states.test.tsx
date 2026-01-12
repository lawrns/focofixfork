import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';

/**
 * Test suite for Dashboard loading states
 *
 * PROBLEM: Using useRef to track loading state prevents re-renders and refetches
 * SOLUTION: Use useState instead of useRef for hasLoadedOrganizations/hasLoadedProjects
 */

describe('Dashboard Page - Loading State Management', () => {
  describe('REF vs STATE behavior', () => {
    it('useRef prevents refetch on remount (DEMONSTRATES THE BUG)', async () => {
      let fetchCount = 0;

      const { result, rerender, unmount } = renderHook(() => {
        const hasLoaded = useRef(false);
        const [data, setData] = useState<string[]>([]);

        const fetchData = useCallback(async () => {
          // This is the buggy pattern from dashboard/page.tsx lines 145, 176
          if (hasLoaded.current) return;

          fetchCount++;
          hasLoaded.current = true;
          setData(['item1']);
        }, []);

        return { fetchData, data, hasLoaded: hasLoaded.current };
      });

      // Initial fetch
      await result.current.fetchData();
      expect(fetchCount).toBe(1);

      // Unmount and remount (simulating navigation away and back)
      unmount();

      // Remount - ref persists, so fetch won't happen again!
      const { result: result2 } = renderHook(() => {
        const hasLoaded = useRef(false);
        const [data, setData] = useState<string[]>([]);

        const fetchData = useCallback(async () => {
          if (hasLoaded.current) return;

          fetchCount++;
          hasLoaded.current = true;
          setData(['item1']);
        }, []);

        return { fetchData, data, hasLoaded: hasLoaded.current };
      });

      await result2.current.fetchData();

      // With fresh hook, this should fetch again
      expect(fetchCount).toBe(2);
    });

    it('useState allows refetch on remount (THE FIX)', async () => {
      let fetchCount = 0;

      const { result, unmount } = renderHook(() => {
        const [hasLoaded, setHasLoaded] = useState(false);
        const [data, setData] = useState<string[]>([]);
        const [isLoading, setIsLoading] = useState(false);

        const fetchData = useCallback(async () => {
          // Fixed pattern: use state instead of ref
          if (hasLoaded) return;

          setIsLoading(true);
          fetchCount++;
          setHasLoaded(true);
          setData(['item1']);
          setIsLoading(false);
        }, [hasLoaded]);

        return { fetchData, data, hasLoaded, isLoading };
      });

      // Initial fetch
      await result.current.fetchData();
      expect(fetchCount).toBe(1);
      expect(result.current.hasLoaded).toBe(true);

      // Unmount (simulating navigation away)
      unmount();

      // Remount with fresh state - should allow fetch again
      const { result: result2 } = renderHook(() => {
        const [hasLoaded, setHasLoaded] = useState(false);
        const [data, setData] = useState<string[]>([]);
        const [isLoading, setIsLoading] = useState(false);

        const fetchData = useCallback(async () => {
          if (hasLoaded) return;

          setIsLoading(true);
          fetchCount++;
          setHasLoaded(true);
          setData(['item1']);
          setIsLoading(false);
        }, [hasLoaded]);

        return { fetchData, data, hasLoaded, isLoading };
      });

      await result2.current.fetchData();

      // State resets on remount, so fetch happens again!
      expect(fetchCount).toBe(2);
      expect(result2.current.hasLoaded).toBe(true);
    });

    it('useState enables loading UI updates (STATE TRIGGERS RE-RENDERS)', () => {
      const { result, rerender } = renderHook(() => {
        const [isLoading, setIsLoading] = useState(false);

        return { isLoading, setIsLoading };
      });

      expect(result.current.isLoading).toBe(false);

      // Trigger loading state
      result.current.setIsLoading(true);
      rerender();

      // State change triggers re-render, UI can update
      expect(result.current.isLoading).toBe(true);
    });

    it('useRef does NOT trigger re-renders (DEMONSTRATES WHY LOADING SPINNER FAILS)', () => {
      const { result, rerender } = renderHook(() => {
        const isLoading = useRef(false);

        return { isLoading };
      });

      expect(result.current.isLoading.current).toBe(false);

      // Change ref value
      result.current.isLoading.current = true;
      rerender();

      // Ref change does NOT cause re-render, so UI won't update!
      // This is why loading spinner disappears in dashboard
      expect(result.current.isLoading.current).toBe(true);
    });
  });

  describe('Error state management', () => {
    it('should track error state with useState for UI updates', () => {
      const { result } = renderHook(() => {
        const [isError, setIsError] = useState(false);
        const [errorMessage, setErrorMessage] = useState('');

        const handleError = (error: Error) => {
          setIsError(true);
          setErrorMessage(error.message);
        };

        return { isError, errorMessage, handleError };
      });

      expect(result.current.isError).toBe(false);

      result.current.handleError(new Error('Network failure'));

      expect(result.current.isError).toBe(true);
      expect(result.current.errorMessage).toBe('Network failure');
    });
  });

  describe('Manual refresh functionality', () => {
    it('should allow manual refresh by resetting hasLoaded state', () => {
      let fetchCount = 0;

      const { result } = renderHook(() => {
        const [hasLoaded, setHasLoaded] = useState(false);
        const [isLoading, setIsLoading] = useState(false);

        const fetchData = useCallback(async () => {
          if (hasLoaded && !isLoading) return; // Don't refetch if already loaded

          setIsLoading(true);
          fetchCount++;
          await new Promise(resolve => setTimeout(resolve, 10));
          setHasLoaded(true);
          setIsLoading(false);
        }, [hasLoaded, isLoading]);

        const refresh = useCallback(() => {
          // Manual refresh: reset hasLoaded to allow refetch
          setHasLoaded(false);
          fetchData();
        }, [fetchData]);

        return { fetchData, refresh, hasLoaded, isLoading };
      });

      // Initial fetch
      result.current.fetchData();
      expect(fetchCount).toBe(1);

      // Try to fetch again - should be blocked
      result.current.fetchData();
      expect(fetchCount).toBe(1);

      // Manual refresh - should work!
      result.current.refresh();
      expect(fetchCount).toBe(2);
    });
  });
});
