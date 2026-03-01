'use client';

import { useEffect } from 'react';

export default function TimelinePage() {
  useEffect(() => {
    window.location.replace('/empire/timeline');
  }, []);
  return null;
}
