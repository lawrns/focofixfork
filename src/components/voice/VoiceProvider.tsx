/**
 * VoiceProvider Component
 * Global provider for voice functionality with keyboard shortcuts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { VoiceButton } from './VoiceButton';
import { VoiceHistory } from './VoiceHistory';

export function VoiceProvider() {
  const [showHistory, setShowHistory] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Shift + V - only after mount
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        // Toggle voice dialog by clicking the voice button programmatically
        const voiceButton = document.querySelector('[aria-label="Open voice commands"]') as HTMLButtonElement;
        if (voiceButton) {
          voiceButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMounted]);

  // Don't render until mounted to prevent hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <VoiceButton
        onShowHistory={() => setShowHistory(true)}
        showHistoryButton={true}
      />
      <VoiceHistory
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </>
  );
}
