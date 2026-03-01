'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InboxPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/empire/signals'); }, [router]);
  return null;
}
