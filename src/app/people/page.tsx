'use client';

import { useEffect } from 'react';

export default function PeoplePage() {
  useEffect(() => {
    window.location.replace('/empire/fleet');
  }, []);
  return null;
}
