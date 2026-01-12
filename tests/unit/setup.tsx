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
  Loader2: () => <svg data-testid="loader2-icon" className="h-4 w-4 animate-spin" />,
  Plug: () => <svg data-testid="plug-icon" />,
  CreditCard: () => <svg data-testid="credit-card-icon" />,
  ChevronRight: () => <svg data-testid="chevron-right-icon" />,
  AtSign: () => <svg data-testid="at-sign-icon" />,
  CheckCircle2: () => <svg data-testid="check-circle-2-icon" />,
  MoreHorizontal: () => <svg data-testid="more-horizontal-icon" />,
  MessageSquare: () => <svg data-testid="message-square-icon" />,
  Archive: () => <svg data-testid="archive-icon" />,
  Inbox: () => <svg data-testid="inbox-icon" />,
  Filter: () => <svg data-testid="filter-icon" />,
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

// Enhanced test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockSupabaseResponse = (data: any, error = null) => ({
  data,
  error,
});

export const mockSupabaseQuery = (response: any) => vi.fn(() => response);

// Mock API responses for testing
export const createMockApiResponse = (data: any, status = 200, error = null) => ({
  data,
  status,
  error,
  success: status >= 200 && status < 300,
});

// Performance testing utilities
import { render } from '@testing-library/react';

export const measureRenderTime = async (component: React.ReactElement): Promise<number> => {
  const start = performance.now();
  render(component);
  const end = performance.now();
  return end - start;
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const violations = [];
  // Basic accessibility checks
  const interactiveElements = container.querySelectorAll('button, input, select, textarea, a');
  
  interactiveElements.forEach((element) => {
    if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.textContent?.trim()) {
      violations.push(`${element.tagName} missing accessible name`);
    }
  });
  
  return violations;
};

// Mobile testing utilities
export const mockMobileViewport = (width = 375, height = 667) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Network testing utilities
export const mockNetworkCondition = (condition: 'slow' | 'offline' | 'fast') => {
  const conditions = {
    slow: { effectiveType: 'slow-2g', downlink: 0.1, rtt: 2000 },
    offline: { effectiveType: 'slow-2g', downlink: 0, rtt: 9999 },
    fast: { effectiveType: '4g', downlink: 10, rtt: 100 },
  };
  
  Object.defineProperty(navigator, 'connection', {
    value: conditions[condition],
  });
};

// AI/LLM testing utilities
export const createMockAIResponse = (prompt: string, response: string) => ({
  prompt,
  response,
  timestamp: new Date().toISOString(),
  model: 'llama2',
  tokens_used: Math.floor(Math.random() * 1000) + 100,
});

// Data factory for comprehensive testing
export const createTestDataFactory = () => {
  const users = Array.from({ length: 10 }, (_, i) => createMockUser({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    full_name: `User ${i + 1}`,
  }));
  
  const organizations = Array.from({ length: 5 }, (_, i) => createMockOrganization({
    id: `org-${i + 1}`,
    name: `Organization ${i + 1}`,
    slug: `org-${i + 1}`,
  }));
  
  const projects = Array.from({ length: 20 }, (_, i) => createMockProject({
    id: `project-${i + 1}`,
    name: `Project ${i + 1}`,
    organization_id: organizations[i % organizations.length].id,
    created_by: users[i % users.length].id,
  }));
  
  const tasks = Array.from({ length: 50 }, (_, i) => createMockTask({
    id: `task-${i + 1}`,
    title: `Task ${i + 1}`,
    project_id: projects[i % projects.length].id,
    assigned_to: users[i % users.length].id,
  }));
  
  return { users, organizations, projects, tasks };
};

// Error boundary testing utility
export const createErrorBoundary = () => {
  return class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
    state = { hasError: false, error: null };
    
    static getDerivedStateFromError(error: any) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: any, errorInfo: any) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    render() {
      if (this.state.hasError) {
        return <div data-testid="error-boundary">Error: {this.state.error?.message}</div>;
      }
      return this.props.children;
    }
  };
};

// Form testing utilities
export const fillForm = async (user: any, formData: Record<string, string>) => {
  for (const [field, value] of Object.entries(formData)) {
    const element = user.getByLabelText(field) || user.getByPlaceholderText(field) || user.getByTestId(field);
    await user.clear(element);
    await user.type(element, value);
  }
};

// Drag and drop testing utilities
export const dragAndDrop = async (source: any, target: any) => {
  const dataTransfer = {
    data: new Map(),
    setData: function(key: string, value: string) { this.data.set(key, value); },
    getData: function(key: string) { return this.data.get(key); },
  };
  
  await source.drag(dataTransfer);
  await target.drop(dataTransfer);
};

// Real-time testing utilities
export const createMockWebSocket = () => {
  const listeners = new Map();
  
  return {
    addEventListener: vi.fn((event, callback) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
    }),
    
    removeEventListener: vi.fn((event, callback) => {
      if (listeners.has(event)) {
        const callbacks = listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    }),
    
    // Helper to simulate events
    simulateEvent: (event: string, data: any) => {
      if (listeners.has(event)) {
        listeners.get(event).forEach((callback: Function) => callback(data));
      }
    },
    
    close: vi.fn(),
    send: vi.fn(),
  };
};

export const renderWithProviders = (component: React.ReactElement, options = {}) => {
  // This would typically wrap with all necessary providers
  // For now, we'll just return the component as-is
  return component;
};

// Export all mocks for easy access in tests
export const mocks = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  resizeObserver: global.ResizeObserver,
  intersectionObserver: global.IntersectionObserver,
  matchMedia: window.matchMedia,
  notification: global.Notification,
  serviceWorker: navigator.serviceWorker,
};
