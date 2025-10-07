import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
} as any;

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({
      scope: '/',
      update: vi.fn(),
      unregister: vi.fn(),
    }),
    ready: Promise.resolve({
      active: { postMessage: vi.fn() },
      waiting: null,
      scope: '/',
    }),
    getRegistration: vi.fn().mockResolvedValue(null),
    getRegistrations: vi.fn().mockResolvedValue([]),
  },
});

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Create a dynamic mock that returns itself for method chaining
const createChainableMock = (result = { data: null, error: null, count: 0 }) => {
  const mock = vi.fn().mockResolvedValue(result);
  const proxy = new Proxy(mock, {
    get(target, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'string') {
        // Return the same mock for any method call to allow chaining
        return createChainableMock(result);
      }
      return target[prop];
    }
  });
  return proxy;
};

// Mock environment variables
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_members') {
        return createChainableMock({ data: [{ organization_id: 'org-123' }], error: null, count: 1 });
      }
      return createChainableMock({ data: [], error: null, count: 0 });
    }),
  },
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
  useScroll: () => ({
    scrollYProgress: {
      onChange: vi.fn(),
    },
  }),
  useTransform: vi.fn((value, input, output) => output[0]),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  X: () => <svg data-testid="x-icon" />,
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
  Search: () => <svg data-testid="search-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  EyeOff: () => <svg data-testid="eye-off-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
  Home: () => <svg data-testid="home-icon" />,
  Bell: () => <svg data-testid="bell-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Target: () => <svg data-testid="target-icon" />,
  Flag: () => <svg data-testid="flag-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  FileText: () => <svg data-testid="file-text-icon" />,
  BarChart3: () => <svg data-testid="bar-chart-icon" />,
  TrendingUp: () => <svg data-testid="trending-up-icon" />,
  AlertTriangle: () => <svg data-testid="alert-triangle-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  Zap: () => <svg data-testid="zap-icon" />,
  Smartphone: () => <svg data-testid="smartphone-icon" />,
  Shield: () => <svg data-testid="shield-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
  RefreshCw: () => <svg data-testid="refresh-cw-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  Upload: () => <svg data-testid="upload-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
  PlayCircle: () => <svg data-testid="play-circle-icon" />,
  Volume2: () => <svg data-testid="volume-icon" />,
  MousePointer: () => <svg data-testid="mouse-pointer-icon" />,
  Type: () => <svg data-testid="type-icon" />,
  Palette: () => <svg data-testid="palette-icon" />,
  Keyboard: () => <svg data-testid="keyboard-icon" />,
  Monitor: () => <svg data-testid="monitor-icon" />,
  HardDrive: () => <svg data-testid="hard-drive-icon" />,
  Wifi: () => <svg data-testid="wifi-icon" />,
  WifiOff: () => <svg data-testid="wifi-off-icon" />,
  BellOff: () => <svg data-testid="bell-off-icon" />,
  Sun: () => <svg data-testid="sun-icon" />,
  Moon: () => <svg data-testid="moon-icon" />,
  Mail: () => <svg data-testid="mail-icon" />,
  Key: () => <svg data-testid="key-icon" />,
  Save: () => <svg data-testid="save-icon" />,
}));

// Custom test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'project-123',
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  priority: 'medium',
  organization_id: 'org-123',
  created_by: 'user-123',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  progress_percentage: 50,
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: 'task-123',
  title: 'Test Task',
  description: 'A test task',
  status: 'todo',
  priority: 'medium',
  project_id: 'project-123',
  organization_id: 'org-123',
  created_by: 'user-123',
  assigned_to: 'user-123',
  due_date: '2024-06-01',
  progress_percentage: 0,
  ...overrides,
});

export const createMockMilestone = (overrides = {}) => ({
  id: 'milestone-123',
  title: 'Test Milestone',
  description: 'A test milestone',
  status: 'active',
  priority: 'high',
  project_id: 'project-123',
  organization_id: 'org-123',
  created_by: 'user-123',
  assigned_to: 'user-123',
  start_date: '2024-01-01',
  due_date: '2024-06-01',
  progress_percentage: 75,
  ...overrides,
});

export const createMockGoal = (overrides = {}) => ({
  id: 'goal-123',
  title: 'Test Goal',
  description: 'A test goal',
  type: 'project',
  status: 'active',
  priority: 'high',
  target_value: 100,
  current_value: 50,
  owner_id: 'user-123',
  organization_id: 'org-123',
  project_id: 'project-123',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  progress_percentage: 50,
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  avatar_url: null,
  website_url: null,
  created_by: 'user-123',
  settings: {},
  ...overrides,
});

// Test helpers
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockSupabaseResponse = (data: any, error = null) => ({
  data,
  error,
});

export const mockSupabaseQuery = (response: any) => vi.fn(() => response);

export const renderWithProviders = (component: React.ReactElement) => {
  // This would typically wrap with all necessary providers
  // For now, we'll just return the component as-is
  return component;
};
