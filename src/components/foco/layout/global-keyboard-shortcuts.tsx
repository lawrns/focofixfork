'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateTaskModal } from '@/features/tasks';
import { useCommandPaletteStore, useFocusModeStore } from '@/lib/stores/foco-store';
import { useKeyboardShortcutsModalStore } from '@/lib/hooks/use-keyboard-shortcuts-modal';
import { usePromptOptimizerStore } from '@/lib/stores/prompt-optimizer-store';
import { useTheme } from '@/components/providers/theme-provider';
import { toast } from 'sonner';
import {
  Command,
  FilePlus,
  FolderPlus,
  Focus,
  Sun,
  Moon,
  LayoutDashboard,
  Terminal,
  Users,
  CheckSquare,
  HelpCircle,
  Wand2
} from 'lucide-react';

/**
 * Helper to check if user is typing in an input field
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  
  const tagName = target.tagName.toLowerCase();
  const isInputElement = 
    tagName === 'input' || 
    tagName === 'textarea' || 
    tagName === 'select' ||
    target.isContentEditable;
  
  // Also check for specific roles
  const role = target.getAttribute('role');
  const isRoleEditable = role === 'textbox' || role === 'searchbox' || role === 'combobox';
  
  return isInputElement || isRoleEditable;
}

/**
 * Get the appropriate modifier key label based on platform
 */
function getModifierKey(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl';
}

/**
 * Show toast notification for shortcut activation
 */
function showShortcutToast(message: string, icon?: React.ReactNode) {
  toast.success(message, {
    duration: 2000,
    icon: icon || undefined,
  });
}

/**
 * Global keyboard shortcuts handler
 * Registers and handles keyboard shortcuts across the application
 * 
 * Shortcuts implemented:
 * - Cmd/Ctrl+K - Open Command Surface / Command Palette
 * - Cmd/Ctrl+Shift+T - Create new task
 * - Cmd/Ctrl+Shift+P - Create new project
 * - Cmd/Ctrl+Shift+F - Toggle Focus Mode
 * - Cmd/Ctrl+Shift+L - Toggle theme (light/dark)
 * - G then D - Go to Dashboard
 * - G then C - Go to Command Center
 * - G then A - Go to Agents
 * - G then M - Go to My Work
 * - ? - Show keyboard shortcuts help
 */
export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const { openTaskModal } = useCreateTaskModal();
  const { open: openCommandPalette, toggle: toggleCommandPalette } = useCommandPaletteStore();
  const { open: openShortcutsModal } = useKeyboardShortcutsModalStore();
  const { open: openPromptOptimizer } = usePromptOptimizerStore();
  const { isActive: isFocusModeActive, deactivate: deactivateFocusMode } = useFocusModeStore();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Helper to open project creation (via command palette in create-project mode)
  const openProjectCreation = useCallback(() => {
    openCommandPalette('create-project');
    showShortcutToast('Creating new project...', <FolderPlus className="h-4 w-4" />);
  }, [openCommandPalette]);

  // Helper to toggle focus mode
  const toggleFocusMode = useCallback(() => {
    if (isFocusModeActive) {
      deactivateFocusMode();
      showShortcutToast('Focus mode deactivated', <Focus className="h-4 w-4" />);
    } else {
      // Navigate to My Work where focus mode can be activated
      router.push('/my-work');
      showShortcutToast('Navigate to My Work to start focus mode', <Focus className="h-4 w-4" />);
    }
  }, [isFocusModeActive, deactivateFocusMode, router]);

  // Helper to toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    showShortcutToast(
      `Switched to ${newTheme} mode`,
      newTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
    );
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    let gKeyPressed = false;
    let gKeyTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = isEditableElement(target);
      const key = e.key.toLowerCase();
      const modKey = getModifierKey();

      // ============================================
      // CMD/CTRL + KEY COMBINATIONS
      // ============================================
      
      // Cmd/Ctrl+K - Open Command Palette (always works, even in inputs)
      if ((e.metaKey || e.ctrlKey) && key === 'k' && !e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Don't trigger other shortcuts when typing in inputs
      if (isTyping) return;

      // Cmd/Ctrl+Shift+T - Create new task
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 't') {
        e.preventDefault();
        openTaskModal();
        showShortcutToast('Creating new task...', <FilePlus className="h-4 w-4" />);
        return;
      }

      // Cmd/Ctrl+Shift+P - Create new project
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'p') {
        e.preventDefault();
        openProjectCreation();
        return;
      }

      // Cmd/Ctrl+Shift+F - Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'f') {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Cmd/Ctrl+Shift+L - Toggle theme
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'l') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Cmd/Ctrl+Shift+O - Open Prompt Optimizer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'o') {
        e.preventDefault();
        openPromptOptimizer();
        showShortcutToast('Prompt Optimizer', <Wand2 className="h-4 w-4" />);
        return;
      }

      // ============================================
      // G + KEY NAVIGATION (Vim-style)
      // ============================================
      
      // Handle G + second key navigation sequence
      if (gKeyPressed) {
        e.preventDefault();
        gKeyPressed = false;
        if (gKeyTimeout) clearTimeout(gKeyTimeout);

        switch (key) {
          // Core navigation
          case 'd':
            router.push('/dashboard');
            showShortcutToast('Navigated to Dashboard', <LayoutDashboard className="h-4 w-4" />);
            break;
          case 'c':
            router.push('/empire/command');
            showShortcutToast('Navigated to Command Center', <Terminal className="h-4 w-4" />);
            break;
          case 'a':
            router.push('/empire/agents');
            showShortcutToast('Navigated to Agents', <Users className="h-4 w-4" />);
            break;
          case 'm':
            router.push('/my-work');
            showShortcutToast('Navigated to My Work', <CheckSquare className="h-4 w-4" />);
            break;
          
          // Additional G-key navigation (keeping existing shortcuts)
          case 'h': router.push('/dashboard'); break;
          case 'i': router.push('/clawdbot'); break;
          case 'w': router.push('/my-work'); break;
          case 'r': router.push('/runs'); break;
          case 'l': router.push('/ledger'); break;
          case 'b': router.push('/empire/briefing'); break;
          case 'p': router.push('/empire/missions'); break;
          case 'n': router.push('/empire/signals'); break;
          case 't': router.push('/empire/timeline'); break;
          case 'j': router.push('/empire/agents'); break;
          case 'v': router.push('/empire/pipeline'); break;
          case 'k': router.push('/crons'); break;
          case 'e': router.push('/emails'); break;
          case 'f': router.push('/reports'); break;
          case 'q': router.push('/proposals'); break;
          case 'x': router.push('/empire/hive'); break;
          case 'y': router.push('/policies'); break;
          case 's': router.push('/settings'); break;
        }
        return;
      }

      // ============================================
      // SINGLE KEY SHORTCUTS
      // ============================================
      
      // Don't intercept if any modifier is pressed (except for specific combos handled above)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (key) {
        case 'g':
          // Start G + key sequence
          e.preventDefault();
          gKeyPressed = true;
          gKeyTimeout = setTimeout(() => {
            gKeyPressed = false;
          }, 1000); // Reset after 1 second
          break;

        case '?':
          // Show keyboard shortcuts help
          e.preventDefault();
          openShortcutsModal();
          showShortcutToast('Keyboard shortcuts help', <HelpCircle className="h-4 w-4" />);
          break;

        case '/':
          // Open search/command palette in search mode
          e.preventDefault();
          openCommandPalette('search');
          break;

        // Legacy shortcuts (keeping for backward compatibility)
        case 'c':
          // Create task (legacy, now primarily Cmd+Shift+T)
          e.preventDefault();
          openTaskModal();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Reset G key state if G is released (optional, helps with quick sequences)
      if (e.key.toLowerCase() === 'g' && gKeyPressed) {
        // Don't reset immediately to allow for G+key sequences
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gKeyTimeout) clearTimeout(gKeyTimeout);
    };
  }, [
    router, 
    openTaskModal, 
    openCommandPalette, 
    toggleCommandPalette,
    openProjectCreation,
    toggleFocusMode,
    toggleTheme,
    openShortcutsModal,
    openPromptOptimizer
  ]);

  return null;
}

export default GlobalKeyboardShortcuts;
