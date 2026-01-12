import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

export function useProgressBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Start progress on route change
    const handleStart = () => {
      NProgress.start();
    };

    // Complete progress after route change
    const handleComplete = () => {
      NProgress.done();
    };

    // Listen for route changes
    // We need to detect pathname and searchParams changes to trigger progress
    handleStart();

    // Use a small delay to simulate route completion
    const timer = setTimeout(() => {
      handleComplete();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  return {
    start: () => NProgress.start(),
    done: () => NProgress.done(),
    inc: (amount?: number) => NProgress.inc(amount),
    set: (amount: number) => NProgress.set(amount),
  };
}
