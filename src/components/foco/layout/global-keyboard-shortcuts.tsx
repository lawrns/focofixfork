'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateTaskModal } from '@/features/tasks';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';

/**
 * Global keyboard shortcuts handler
 * Registers and handles keyboard shortcuts across the application
 */
export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const { openTaskModal } = useCreateTaskModal();
  const { open: openCommandPalette } = useCommandPaletteStore();

  useEffect(() => {
    let gKeyPressed = false;
    let gKeyTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Always allow Cmd+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        return; // Handled by command palette
      }

      // Skip all other shortcuts when typing
      if (isTyping) return;

      const key = e.key.toLowerCase();

      // Handle G + second key navigation (e.g., G H for home)
      if (gKeyPressed) {
        e.preventDefault();
        gKeyPressed = false;
        if (gKeyTimeout) clearTimeout(gKeyTimeout);

        switch (key) {
          case 'h':
            router.push('/dashboard');
            break;
          case 'i':
            router.push('/inbox');
            break;
          case 'm':
            router.push('/my-work');
            break;
          case 'p':
            router.push('/projects');
            break;
          case 't':
            router.push('/timeline');
            break;
          case 'd':
            router.push('/docs');
            break;
          case 'e':
            router.push('/people');
            break;
          case 'r':
            router.push('/reports');
            break;
          case 's':
            router.push('/settings');
            break;
        }
        return;
      }

      // Handle single key shortcuts
      switch (key) {
        case 'c':
          // Create task
          e.preventDefault();
          openTaskModal();
          break;
        case 'p':
          // Create project
          e.preventDefault();
          router.push('/projects?create=true');
          break;
        case 'd':
          // Create doc
          e.preventDefault();
          router.push('/docs?create=true');
          break;
        case 'g':
          // Start G + key sequence
          e.preventDefault();
          gKeyPressed = true;
          gKeyTimeout = setTimeout(() => {
            gKeyPressed = false;
          }, 1000); // Reset after 1 second
          break;
        case '/':
          // Open search
          e.preventDefault();
          openCommandPalette('search');
          break;
        case '?':
          // Show keyboard shortcuts (with shift)
          if (e.shiftKey) {
            e.preventDefault();
            // Open keyboard shortcuts modal
            const event = new CustomEvent('open-keyboard-shortcuts');
            window.dispatchEvent(event);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimeout) clearTimeout(gKeyTimeout);
    };
  }, [router, openTaskModal, openCommandPalette]);

  return null;
}
