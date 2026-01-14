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

  // Keyboard shortcut: Cmd/Ctrl + Shift + V
  useEffect(() => {
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
  }, []);

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
