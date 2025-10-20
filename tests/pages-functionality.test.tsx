import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock all external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'test-id' }),
}))

vi.mock('lucide-react', () => ({
  Circle: () => 'Circle',
  CheckCircle: () => 'CheckCircle',
  Clock: () => 'Clock',
  AlertCircle: () => 'AlertCircle',
  Plus: () => 'Plus',
  Edit: () => 'Edit',
  Trash2: () => 'Trash2',
  Eye: () => 'Eye',
  MoreHorizontal: () => 'MoreHorizontal',
  Calendar: () => 'Calendar',
  User: () => 'User',
  Settings: () => 'Settings',
  Search: () => 'Search',
  Filter: () => 'Filter',
  ArrowUpDown: () => 'ArrowUpDown',
  ChevronDown: () => 'ChevronDown',
  ChevronRight: () => 'ChevronRight',
  X: () => 'X',
  Check: () => 'Check',
  Loader2: () => 'Loader2',
  AlertTriangle: () => 'AlertTriangle',
  Info: () => 'Info',
  ExternalLink: () => 'ExternalLink',
  Download: () => 'Download',
  Upload: () => 'Upload',
  Copy: () => 'Copy',
  Share: () => 'Share',
  Star: () => 'Star',
  Heart: () => 'Heart',
  Bookmark: () => 'Bookmark',
  Flag: () => 'Flag',
  Tag: () => 'Tag',
  Folder: () => 'Folder',
  File: () => 'File',
  Image: () => 'Image',
  Video: () => 'Video',
  Music: () => 'Music',
  Archive: () => 'Archive',
  Lock: () => 'Lock',
  Unlock: () => 'Unlock',
  Key: () => 'Key',
  Shield: () => 'Shield',
  ShieldCheck: () => 'ShieldCheck',
  ShieldAlert: () => 'ShieldAlert',
  Globe: () => 'Globe',
  Wifi: () => 'Wifi',
  WifiOff: () => 'WifiOff',
  Signal: () => 'Signal',
  Battery: () => 'Battery',
  BatteryLow: () => 'BatteryLow',
  BatteryMedium: () => 'BatteryMedium',
  BatteryHigh: () => 'BatteryHigh',
  Volume2: () => 'Volume2',
  VolumeX: () => 'VolumeX',
  Mic: () => 'Mic',
  MicOff: () => 'MicOff',
  Camera: () => 'Camera',
  CameraOff: () => 'CameraOff',
  Monitor: () => 'Monitor',
  Smartphone: () => 'Smartphone',
  Tablet: () => 'Tablet',
  Laptop: () => 'Laptop',
  Desktop: () => 'Desktop',
  Server: () => 'Server',
  Database: () => 'Database',
  HardDrive: () => 'HardDrive',
  Cpu: () => 'Cpu',
  MemoryStick: () => 'MemoryStick',
  Router: () => 'Router',
  Network: () => 'Network',
  Cloud: () => 'Cloud',
  CloudOff: () => 'CloudOff',
  CloudRain: () => 'CloudRain',
  CloudSnow: () => 'CloudSnow',
  CloudLightning: () => 'CloudLightning',
  Sun: () => 'Sun',
  Moon: () => 'Moon',
  Sunrise: () => 'Sunrise',
  Sunset: () => 'Sunset',
  Droplets: () => 'Droplets',
  Wind: () => 'Wind',
  Thermometer: () => 'Thermometer',
  Gauge: () => 'Gauge',
  Activity: () => 'Activity',
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  BarChart: () => 'BarChart',
  BarChart3: () => 'BarChart3',
  LineChart: () => 'LineChart',
  PieChart: () => 'PieChart',
  AreaChart: () => 'AreaChart',
  Scatter: () => 'Scatter',
  Target: () => 'Target',
  Crosshair: () => 'Crosshair',
  Focus: () => 'Focus',
  Zap: () => 'Zap',
  ZapOff: () => 'ZapOff',
  Flashlight: () => 'Flashlight',
  FlashlightOff: () => 'FlashlightOff',
  Lightbulb: () => 'Lightbulb',
  LightbulbOff: () => 'LightbulbOff',
  Lamp: () => 'Lamp',
  LampDesk: () => 'LampDesk',
  LampFloor: () => 'LampFloor',
  LampWallDown: () => 'LampWallDown',
  LampWallUp: () => 'LampWallUp',
  LampCeiling: () => 'LampCeiling',
  Candlestick: () => 'Candlestick',
  Flame: () => 'Flame',
  FlameKindling: () => 'FlameKindling',
  Matchstick: () => 'Matchstick',
  Cigarette: () => 'Cigarette',
  CigaretteOff: () => 'CigaretteOff',
  Beer: () => 'Beer',
  Wine: () => 'Wine',
  Coffee: () => 'Coffee',
  Tea: () => 'Tea',
  Milk: () => 'Milk',
  IceCream: () => 'IceCream',
  Cookie: () => 'Cookie',
  Cake: () => 'Cake',
  Pizza: () => 'Pizza',
  Sandwich: () => 'Sandwich',
  Apple: () => 'Apple',
  Banana: () => 'Banana',
  Carrot: () => 'Carrot',
  Corn: () => 'Corn',
  Grape: () => 'Grape',
  Lemon: () => 'Lemon',
  Orange: () => 'Orange',
  Strawberry: () => 'Strawberry',
  Cherry: () => 'Cherry',
  Peach: () => 'Peach',
  Pear: () => 'Pear',
  Pineapple: () => 'Pineapple',
  Watermelon: () => 'Watermelon',
  Avocado: () => 'Avocado',
  Broccoli: () => 'Broccoli',
  Cabbage: () => 'Cabbage',
  Cucumber: () => 'Cucumber',
  Eggplant: () => 'Eggplant',
  Garlic: () => 'Garlic',
  Ginger: () => 'Ginger',
  Mushroom: () => 'Mushroom',
  Onion: () => 'Onion',
  Pepper: () => 'Pepper',
  Potato: () => 'Potato',
  Tomato: () => 'Tomato',
  Wheat: () => 'Wheat',
  Rice: () => 'Rice',
  Corn2: () => 'Corn2',
  Bean: () => 'Bean',
  Peanut: () => 'Peanut',
  Almond: () => 'Almond',
  Cashew: () => 'Cashew',
  Walnut: () => 'Walnut',
  Pistachio: () => 'Pistachio',
  Hazelnut: () => 'Hazelnut',
  Chestnut: () => 'Chestnut',
  Coconut: () => 'Coconut',
  Olive: () => 'Olive',
  Sunflower: () => 'Sunflower',
  Rose: () => 'Rose',
  Tulip: () => 'Tulip',
  Daisy: () => 'Daisy',
  Lily: () => 'Lily',
  Orchid: () => 'Orchid',
  Violet: () => 'Violet',
  Lavender: () => 'Lavender',
  Jasmine: () => 'Jasmine',
  Magnolia: () => 'Magnolia',
  Peony: () => 'Peony',
  Hydrangea: () => 'Hydrangea',
  Azalea: () => 'Azalea',
  Camellia: () => 'Camellia',
  Hibiscus: () => 'Hibiscus',
  Poppy: () => 'Poppy',
  Marigold: () => 'Marigold',
  Chrysanthemum: () => 'Chrysanthemum',
  Geranium: () => 'Geranium',
  Petunia: () => 'Petunia',
  Begonia: () => 'Begonia',
  Impatiens: () => 'Impatiens',
  Pansy: () => 'Pansy',
  Snapdragon: () => 'Snapdragon',
  Zinnia: () => 'Zinnia',
  Cosmos: () => 'Cosmos',
  Aster: () => 'Aster',
  Delphinium: () => 'Delphinium',
  Foxglove: () => 'Foxglove',
  Hollyhock: () => 'Hollyhock',
  Larkspur: () => 'Larkspur',
  Lupine: () => 'Lupine',
  SweetPea: () => 'SweetPea',
  MorningGlory: () => 'MorningGlory',
  Nasturtium: () => 'Nasturtium',
  Pansy2: () => 'Pansy2',
  Primrose: () => 'Primrose',
  Verbena: () => 'Verbena',
  Salvia: () => 'Salvia',
  Sage: () => 'Sage',
  Rosemary: () => 'Rosemary',
  Thyme: () => 'Thyme',
  Oregano: () => 'Oregano',
  Basil: () => 'Basil',
  Parsley: () => 'Parsley',
  Cilantro: () => 'Cilantro',
  Dill: () => 'Dill',
  Fennel: () => 'Fennel',
  Mint: () => 'Mint',
  Chives: () => 'Chives',
  Tarragon: () => 'Tarragon',
  Bay: () => 'Bay',
  Clove: () => 'Clove',
  Cinnamon: () => 'Cinnamon',
  Nutmeg: () => 'Nutmeg',
  Cardamom: () => 'Cardamom',
  Vanilla: () => 'Vanilla',
  Saffron: () => 'Saffron',
  Turmeric: () => 'Turmeric',
  Paprika: () => 'Paprika',
  Cayenne: () => 'Cayenne',
  Jalapeno: () => 'Jalapeno',
  Habanero: () => 'Habanero',
  Ghost: () => 'Ghost',
  Carolina: () => 'Carolina',
  Reaper: () => 'Reaper',
  Scorpion: () => 'Scorpion',
  Trinidad: () => 'Trinidad',
  Moruga: () => 'Moruga',
  Bhut: () => 'Bhut',
  Jolokia: () => 'Jolokia',
  Chocolate: () => 'Chocolate',
  Douglah: () => 'Douglah',
  Brain: () => 'Brain',
  Strain: () => 'Strain',
  Butch: () => 'Butch',
  T: () => 'T',
  Scorpion2: () => 'Scorpion2',
  Blend: () => 'Blend',
  PlayCircle: () => 'PlayCircle',
}))

vi.mock('../src/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../src/lib/supabase-server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../src/lib/i18n/context', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}))

vi.mock('../src/lib/contexts/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('../src/components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}))

vi.mock('../src/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock fetch
global.fetch = vi.fn()

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
})

// Mock window.confirm
const mockConfirm = vi.fn(() => true)
global.confirm = mockConfirm

// Mock window.alert
const mockAlert = vi.fn()
global.alert = mockAlert

describe('Pages Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReload.mockClear()
    mockConfirm.mockClear()
    mockAlert.mockClear()
  })

  describe('Basic Page Rendering', () => {
    it('should render projects page without crashing', async () => {
      // Mock fetch for projects
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'project-1', name: 'Test Project 1', description: 'Desc 1', status: 'active', priority: 'high', progress_percentage: 50, created_at: '2023-01-01', organization_id: 'org-1' },
          ],
        }),
      } as Response)

      const { default: ProjectsPage } = await import('../src/app/projects/page')
      render(<ProjectsPage />)
      
      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })

    it('should render milestones page without crashing', async () => {
      // Mock fetch for milestones
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'milestone-1', name: 'Test Milestone 1', description: 'Milestone Desc 1', status: 'in-progress', priority: 'high', due_date: '2025-12-31', project_id: 'project-1' },
          ],
        }),
      } as Response)

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)
      
      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })

    it('should render tasks page without crashing', async () => {
      // Mock fetch for tasks
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'task-1', title: 'Test Task 1', description: 'Task Desc 1', status: 'todo', priority: 'medium', project_id: 'project-1', assigned_to: 'user-1' },
          ],
        }),
      } as Response)

      const { default: TasksPage } = await import('../src/app/tasks/page')
      render(<TasksPage />)
      
      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })

    it('should render organizations page without crashing', async () => {
      // Mock fetch for organizations
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'org-1', name: 'Test Org', is_active: true, created_by: 'user-1', created_at: '2023-01-01' },
          ],
        }),
      } as Response)

      const { default: OrganizationsPage } = await import('../src/app/organizations/page')
      render(<OrganizationsPage />)
      
      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })
  })

  describe('API Integration Tests', () => {
    it('should handle project deletion API call', async () => {
      vi.mocked(fetch).mockImplementation((url, options) => {
        if (url === '/api/projects/project-1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 'project-1', name: 'Test Project 1', description: 'Desc 1', status: 'active', priority: 'high', progress_percentage: 50, created_at: '2023-01-01', organization_id: 'org-1' },
            ],
          }),
        } as Response)
      })

      const { default: ProjectsPage } = await import('../src/app/projects/page')
      render(<ProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      // Find delete button and click it
      const deleteButtons = screen.getAllByLabelText('Delete project')
      fireEvent.click(deleteButtons[0])

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this project? This action cannot be undone.')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/projects/project-1', { method: 'DELETE' })
      })
      
      expect(mockReload).toHaveBeenCalled()
    })

    it('should handle milestone deletion API call', async () => {
      vi.mocked(fetch).mockImplementation((url, options) => {
        if (url === '/api/milestones/milestone-1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 'milestone-1', name: 'Test Milestone 1', description: 'Milestone Desc 1', status: 'in-progress', priority: 'high', due_date: '2025-12-31', project_id: 'project-1' },
            ],
          }),
        } as Response)
      })

      const { default: MilestonesPage } = await import('../src/app/milestones/page')
      render(<MilestonesPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Milestone 1')).toBeInTheDocument()
      })

      // Open dropdown menu
      const moreOptionsButton = screen.getByRole('button', { name: /More options/i })
      fireEvent.click(moreOptionsButton)

      // Click delete option
      const deleteButton = screen.getByText('Delete Milestone')
      fireEvent.click(deleteButton)

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this milestone? This action cannot be undone.')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/milestones/milestone-1', { method: 'DELETE' })
      })
      
      expect(mockReload).toHaveBeenCalled()
    })

    it('should handle task deletion API call', async () => {
      vi.mocked(fetch).mockImplementation((url, options) => {
        if (url === '/api/tasks/task-1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 'task-1', title: 'Test Task 1', description: 'Task Desc 1', status: 'todo', priority: 'medium', project_id: 'project-1', assigned_to: 'user-1' },
            ],
          }),
        } as Response)
      })

      const { default: TasksPage } = await import('../src/app/tasks/page')
      render(<TasksPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument()
      })

      // Find delete button and click it
      const deleteButtons = screen.getAllByLabelText('Delete task')
      fireEvent.click(deleteButtons[0])

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this task? This action cannot be undone.')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-1', { method: 'DELETE' })
      })
      
      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const { default: ProjectsPage } = await import('../src/app/projects/page')
      render(<ProjectsPage />)

      // Should not crash and should render the layout
      expect(screen.getAllByTestId('main-layout')).toHaveLength(1)
    })

    it('should handle empty data responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [],
        }),
      } as Response)

      const { default: ProjectsPage } = await import('../src/app/projects/page')
      render(<ProjectsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument()
      })
    })
  })
})
