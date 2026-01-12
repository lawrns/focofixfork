'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Workspace, 
  WorkItem, 
  Project, 
  InboxItem, 
  AISuggestion,
  DensitySetting,
  ViewType
} from '@/types/foco';

// ============================================================================
// WORKSPACE STORE
// ============================================================================
interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
}));

// ============================================================================
// UI PREFERENCES STORE (Persisted)
// ============================================================================
interface UIPreferences {
  density: DensitySetting;
  sidebarCollapsed: boolean;
  defaultView: ViewType;
  showAISuggestions: boolean;
  focusModeEnabled: boolean;
}

interface UIPreferencesState extends UIPreferences {
  setDensity: (density: DensitySetting) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDefaultView: (view: ViewType) => void;
  setShowAISuggestions: (show: boolean) => void;
  setFocusModeEnabled: (enabled: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      sidebarCollapsed: false,
      defaultView: 'list',
      showAISuggestions: true,
      focusModeEnabled: false,
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setDefaultView: (view) => set({ defaultView: view }),
      setShowAISuggestions: (show) => set({ showAISuggestions: show }),
      setFocusModeEnabled: (enabled) => set({ focusModeEnabled: enabled }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'foco-ui-preferences',
    }
  )
);

// ============================================================================
// COMMAND PALETTE STORE
// ============================================================================
interface CommandPaletteState {
  isOpen: boolean;
  mode: 'search' | 'create' | 'navigate' | 'create-project' | 'create-doc' | 'import';
  query: string;
  open: (mode?: 'search' | 'create' | 'navigate' | 'create-project' | 'create-doc' | 'import') => void;
  close: () => void;
  setQuery: (query: string) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  mode: 'search',
  query: '',
  open: (mode = 'search') => set({ isOpen: true, mode, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  setQuery: (query) => set({ query }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

// ============================================================================
// INBOX STORE
// ============================================================================
interface InboxState {
  items: InboxItem[];
  unreadCount: number;
  setItems: (items: InboxItem[]) => void;
  markAsRead: (id: string) => void;
  markAsResolved: (id: string) => void;
  snooze: (id: string, until: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  items: [],
  unreadCount: 0,
  setItems: (items) => set({ 
    items, 
    unreadCount: items.filter(i => !i.is_read).length 
  }),
  markAsRead: (id) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, is_read: true } : item
    ),
    unreadCount: state.items.filter(i => !i.is_read && i.id !== id).length,
  })),
  markAsResolved: (id) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, is_resolved: true, is_read: true } : item
    ),
  })),
  snooze: (id, until) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, snoozed_until: until, is_read: true } : item
    ),
  })),
}));

// ============================================================================
// AI SUGGESTIONS STORE
// ============================================================================
interface AISuggestionsState {
  suggestions: AISuggestion[];
  isLoading: boolean;
  setSuggestions: (suggestions: AISuggestion[]) => void;
  applySuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAISuggestionsStore = create<AISuggestionsState>((set) => ({
  suggestions: [],
  isLoading: false,
  setSuggestions: (suggestions) => set({ suggestions }),
  applySuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.map(s => 
      s.id === id ? { ...s, status: 'applied' as const, applied_at: new Date().toISOString() } : s
    ),
  })),
  dismissSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.map(s => 
      s.id === id ? { ...s, status: 'dismissed' as const, dismissed_at: new Date().toISOString() } : s
    ),
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// ============================================================================
// UNDO STORE
// ============================================================================
interface UndoAction {
  id: string;
  type: string;
  description: string;
  undo: () => Promise<void>;
  timestamp: number;
  expiresAt: number;
}

interface UndoState {
  actions: UndoAction[];
  addAction: (action: Omit<UndoAction, 'timestamp' | 'expiresAt'>) => void;
  removeAction: (id: string) => void;
  undoAction: (id: string) => Promise<void>;
  clearExpired: () => void;
}

const UNDO_EXPIRY_MS = 10000; // 10 seconds

export const useUndoStore = create<UndoState>((set, get) => ({
  actions: [],
  addAction: (action) => {
    const now = Date.now();
    set((state) => ({
      actions: [
        ...state.actions.filter(a => a.expiresAt > now),
        { 
          ...action, 
          timestamp: now, 
          expiresAt: now + UNDO_EXPIRY_MS 
        }
      ].slice(-5), // Keep last 5 actions
    }));
  },
  removeAction: (id) => set((state) => ({
    actions: state.actions.filter(a => a.id !== id),
  })),
  undoAction: async (id) => {
    const action = get().actions.find(a => a.id === id);
    if (action && action.expiresAt > Date.now()) {
      await action.undo();
      set((state) => ({
        actions: state.actions.filter(a => a.id !== id),
      }));
    }
  },
  clearExpired: () => {
    const now = Date.now();
    set((state) => ({
      actions: state.actions.filter(a => a.expiresAt > now),
    }));
  },
}));

// ============================================================================
// FOCUS MODE STORE
// ============================================================================
interface FocusModeState {
  isActive: boolean;
  currentWorkItem: WorkItem | null;
  timerStartedAt: number | null;
  timerDuration: number; // in seconds
  activate: (workItem: WorkItem) => void;
  deactivate: () => void;
  startTimer: () => void;
  stopTimer: () => void;
}

export const useFocusModeStore = create<FocusModeState>((set) => ({
  isActive: false,
  currentWorkItem: null,
  timerStartedAt: null,
  timerDuration: 0,
  activate: (workItem) => set({ 
    isActive: true, 
    currentWorkItem: workItem,
    timerStartedAt: null,
    timerDuration: 0,
  }),
  deactivate: () => set({ 
    isActive: false, 
    currentWorkItem: null,
    timerStartedAt: null,
  }),
  startTimer: () => set({ timerStartedAt: Date.now() }),
  stopTimer: () => set((state) => ({
    timerStartedAt: null,
    timerDuration: state.timerStartedAt 
      ? state.timerDuration + Math.floor((Date.now() - state.timerStartedAt) / 1000)
      : state.timerDuration,
  })),
}));

// ============================================================================
// PRESENCE STORE (Real-time collaboration)
// ============================================================================
interface PresenceUser {
  user_id: string;
  name: string;
  avatar_url?: string;
  current_page?: string;
  current_entity_type?: string;
  current_entity_id?: string;
  last_seen_at: string;
}

interface PresenceState {
  onlineUsers: PresenceUser[];
  setOnlineUsers: (users: PresenceUser[]) => void;
  addUser: (user: PresenceUser) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<PresenceUser>) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addUser: (user) => set((state) => ({
    onlineUsers: [...state.onlineUsers.filter(u => u.user_id !== user.user_id), user],
  })),
  removeUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(u => u.user_id !== userId),
  })),
  updateUser: (userId, updates) => set((state) => ({
    onlineUsers: state.onlineUsers.map(u => 
      u.user_id === userId ? { ...u, ...updates } : u
    ),
  })),
}));

// ============================================================================
// SELECTED ITEMS STORE (for bulk actions)
// ============================================================================
interface SelectedItemsState {
  selectedIds: Set<string>;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectedItemsStore = create<SelectedItemsState>((set, get) => ({
  selectedIds: new Set(),
  selectItem: (id) => set((state) => ({
    selectedIds: new Set([...state.selectedIds, id]),
  })),
  deselectItem: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    newSet.delete(id);
    return { selectedIds: newSet };
  }),
  toggleItem: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet };
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  isSelected: (id) => get().selectedIds.has(id),
}));
