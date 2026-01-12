import { useCallback } from 'react';
import NProgress from 'nprogress';

export function useApiProgress() {
  const withProgress = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options?: {
      onStart?: () => void;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T> => {
    try {
      NProgress.start();
      options?.onStart?.();

      const result = await asyncFn();

      NProgress.done();
      options?.onComplete?.();

      return result;
    } catch (error) {
      NProgress.done();
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
      throw err;
    }
  }, []);

  return { withProgress };
}
