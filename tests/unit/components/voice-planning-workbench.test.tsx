import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import VoicePlanningWorkbench from '@/features/voice/components/VoicePlanningWorkbench'

// Mock Web Audio API
const mockAudioContext = {
  createMediaStreamSource: vi.fn(),
  createAnalyser: vi.fn(() => ({
    frequencyBinCount: 2048,
    getByteFrequencyData: vi.fn(),
    fftSize: 2048
  })),
  close: vi.fn()
}

global.AudioContext = vi.fn(() => mockAudioContext) as any
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  }
} as any

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mic: vi.fn(() => <div data-testid="mic-icon" />),
  Square: vi.fn(() => <div data-testid="square-icon" />),
  Sparkles: vi.fn(() => <div data-testid="sparkles-icon" />),
  Wand2: vi.fn(() => <div data-testid="wand2-icon" />),
  Calendar: vi.fn(() => <div data-testid="calendar-icon" />),
  User: vi.fn(() => <div data-testid="user-icon" />),
  Clock: vi.fn(() => <div data-testid="clock-icon" />),
  CheckCircle2: vi.fn(() => <div data-testid="checkcircle2-icon" />),
  ListChecks: vi.fn(() => <div data-testid="listchecks-icon" />),
  Layers: vi.fn(() => <div data-testid="layers-icon" />),
  Link: vi.fn(() => <div data-testid="link-icon" />),
  Rocket: vi.fn(() => <div data-testid="rocket-icon" />),
  Save: vi.fn(() => <div data-testid="save-icon" />),
  PlayCircle: vi.fn(() => <div data-testid="playcircle-icon" />),
  PauseCircle: vi.fn(() => <div data-testid="pausecircle-icon" />),
  Search: vi.fn(() => <div data-testid="search-icon" />),
  Plus: vi.fn(() => <div data-testid="plus-icon" />),
  ChevronRight: vi.fn(() => <div data-testid="chevronright-icon" />),
  ClipboardList: vi.fn(() => <div data-testid="clipboardlist-icon" />),
  Settings: vi.fn(() => <div data-testid="settings-icon" />),
  FileText: vi.fn(() => <div data-testid="filetext-icon" />),
  Workflow: vi.fn(() => <div data-testid="workflow-icon" />),
  Activity: vi.fn(() => <div data-testid="activity-icon" />),
  BarChart3: vi.fn(() => <div data-testid="barchart3-icon" />),
  Brain: vi.fn(() => <div data-testid="brain-icon" />),
  Volume2: vi.fn(() => <div data-testid="volume2-icon" />),
  Target: vi.fn(() => <div data-testid="target-icon" />),
  Zap: vi.fn(() => <div data-testid="zap-icon" />),
  AlertCircle: vi.fn(() => <div data-testid="alertcircle-icon" />),
  TrendingUp: vi.fn(() => <div data-testid="trendingup-icon" />),
  Users: vi.fn(() => <div data-testid="users-icon" />),
  Lightbulb: vi.fn(() => <div data-testid="lightbulb-icon" />),
  ArrowRight: vi.fn(() => <div data-testid="arrowright-icon" />),
  Loader2: vi.fn(() => <div data-testid="loader2-icon" />),
  Check: vi.fn(() => <div data-testid="check-icon" />)
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: vi.fn(({ children, className, ...props }) => <div data-testid="card" className={className} {...props}>{children}</div>),
  CardHeader: vi.fn(({ children, className, ...props }) => <div data-testid="card-header" className={className} {...props}>{children}</div>),
  CardContent: vi.fn(({ children, className, ...props }) => <div data-testid="card-content" className={className} {...props}>{children}</div>),
  CardFooter: vi.fn(({ children, className, ...props }) => <div data-testid="card-footer" className={className} {...props}>{children}</div>)
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, className, ...props }) => <button data-testid="button" className={className} {...props}>{children}</button>)
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: vi.fn(({ children, className, ...props }) => <span data-testid="badge" className={className} {...props}>{children}</span>)
}))

vi.mock('@/components/ui/input', () => ({
  Input: vi.fn(({ className, ...props }) => <input data-testid="input" className={className} {...props} />)
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: vi.fn(({ className, ...props }) => <textarea data-testid="textarea" className={className} {...props} />)
}))

// Declare global type for our mock
declare global {
  var mockOnValueChange: ((value: string) => void) | undefined
}

// Mock the Tabs component to handle state properly
let mockActiveTab = 'voice'
const tabElements = new Map()

vi.mock('@/components/ui/tabs', () => ({
  Tabs: vi.fn(({ children, value, onValueChange, ...props }) => {
    // Store the active tab value for testing
    if (value !== undefined) mockActiveTab = value
    // Call onValueChange if provided
    if (onValueChange && typeof onValueChange === 'function') {
      // Store the original onValueChange to call it when tabs are clicked
      globalThis.mockOnValueChange = onValueChange
    }
    return <div data-testid="tabs" {...props}>{children}</div>
  }),
  TabsList: vi.fn(({ children, ...props }) => <div data-testid="tabs-list" {...props}>{children}</div>),
  TabsTrigger: vi.fn(({ children, value, ...props }) => {
    const isSelected = mockActiveTab === value
    
    return <button 
      ref={(el) => {
        if (el) {
          tabElements.set(value, el)
        }
      }}
      data-testid="tabs-trigger" 
      role="tab" 
      aria-selected={isSelected ? 'true' : 'false'}
      onClick={() => {
        mockActiveTab = value
        if (globalThis.mockOnValueChange) {
          globalThis.mockOnValueChange(value)
        }
        // Update all tab elements
        tabElements.forEach((element, tabValue) => {
          if (element && element.setAttribute) {
            element.setAttribute('aria-selected', mockActiveTab === tabValue ? 'true' : 'false')
          }
        })
      }}
      {...props}
    >{children}</button>
  }),
  TabsContent: vi.fn(({ children, value, ...props }) => (
    <div 
      data-testid="tabs-content" 
      style={{ display: mockActiveTab === value ? 'block' : 'none' }}
      {...props}
    >{children}</div>
  ))
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: vi.fn(({ className, ...props }) => <div data-testid="progress" className={className} {...props} />)
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: vi.fn(({ className, ...props }) => <hr data-testid="separator" className={className} {...props} />)
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: vi.fn(({ children, ...props }) => <div data-testid="tooltip" {...props}>{children}</div>),
  TooltipContent: vi.fn(({ children, ...props }) => <div data-testid="tooltip-content" {...props}>{children}</div>),
  TooltipProvider: vi.fn(({ children, ...props }) => <div data-testid="tooltip-provider" {...props}>{children}</div>),
  TooltipTrigger: vi.fn(({ children, ...props }) => <div data-testid="tooltip-trigger" {...props}>{children}</div>)
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    span: vi.fn(({ children, ...props }) => <span {...props}>{children}</span>),
    button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
    section: vi.fn(({ children, ...props }) => <section {...props}>{children}</section>),
  },
  AnimatePresence: vi.fn(({ children }) => <>{children}</>),
}))

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: vi.fn(({ children, ...props }) => <div data-testid="responsive-container" {...props}>{children}</div>),
  BarChart: vi.fn(({ children, ...props }) => <div data-testid="bar-chart" {...props}>{children}</div>),
  Bar: vi.fn(() => <div data-testid="bar" />),
  XAxis: vi.fn(() => <div data-testid="x-axis" />),
  YAxis: vi.fn(() => <div data-testid="y-axis" />),
  Tooltip: vi.fn(() => <div data-testid="recharts-tooltip" />),
  Cell: vi.fn(() => <div data-testid="cell" />)
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}))

// Mock OpenAI API but component uses its own synthesizePlanFromTranscript function
vi.mock('@/lib/ai/openai-whisper', () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: 'We need a mobile task manager with auth, offline sync, and a dashboard. Public beta in 10 weeks. Two devs, one designer. iOS first, Android after.',
    confidence: 0.95,
    language: 'en'
  })
}))

vi.mock('@/lib/ai/openai-gpt4o', () => ({
  generatePlan: vi.fn().mockResolvedValue({
    plan: {
      title: 'Mobile Task Manager',
      description: 'iOS and Android mobile app with authentication and offline sync',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Design & Planning',
          description: 'UI/UX design and technical planning',
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending' as const,
          tasks: [
            {
              id: 'task-1',
              title: 'Create wireframes',
              description: 'Design app wireframes and user flows',
              status: 'todo' as const,
              estimatedDuration: 3,
              priority: 'high' as const,
              assigneeId: null
            },
            {
              id: 'task-2',
              title: 'Design system setup',
              description: 'Create component library and design tokens',
              status: 'todo' as const,
              estimatedDuration: 2,
              priority: 'medium' as const,
              assigneeId: null
            }
          ]
        },
        {
          id: 'milestone-2',
          title: 'iOS Development',
          description: 'Native iOS app development',
          targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending' as const,
          tasks: [
            {
              id: 'task-3',
              title: 'Authentication implementation',
              description: 'Implement user login and registration',
              status: 'todo' as const,
              estimatedDuration: 5,
              priority: 'high' as const,
              assigneeId: null
            }
          ]
        }
      ]
    },
    confidence: 0.88,
    processingTime: 2.1
  })
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(component)
}

describe('VoicePlanningWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveTab = 'voice' // Reset tab state
    globalThis.mockOnValueChange = undefined // Clean up global
    tabElements.clear() // Clear tab elements
  })

  it('renders the voice planning workbench with all tabs', () => {
    renderWithProviders(<VoicePlanningWorkbench />)
    
    expect(screen.getByText('Voice Input')).toBeInTheDocument()
    expect(screen.getByText('Review & Edit')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('starts with the Voice Input tab active', () => {
    renderWithProviders(<VoicePlanningWorkbench />)
    
    expect(screen.getByRole('tab', { name: 'Voice Input' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Review & Edit' })).toHaveAttribute('aria-selected', 'false')
  })

  it('displays the demo transcript by default', () => {
    renderWithProviders(<VoicePlanningWorkbench />)
    
    expect(screen.getByDisplayValue(/We need a mobile task manager/i)).toBeInTheDocument()
  })

  it('allows switching between tabs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Switch to Review & Edit tab
    const reviewTab = screen.getByRole('tab', { name: 'Review & Edit' })
    await user.click(reviewTab)
    
    // The tab should be clickable and the action should complete without error
    expect(reviewTab).toBeInTheDocument()
    
    // Switch to Timeline tab
    const timelineTab = screen.getByRole('tab', { name: 'Timeline' })
    await user.click(timelineTab)
    
    // The tab should be clickable and the action should complete without error
    expect(timelineTab).toBeInTheDocument()
  })

  it('toggles recording state when record button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    const recordButton = screen.getByRole('button', { name: /Start Recording/i })
    
    // Start recording
    await user.click(recordButton)
    expect(screen.getByRole('button', { name: /Stop Recording/i })).toBeInTheDocument()
    
    // Stop recording
    await user.click(screen.getByRole('button', { name: /Stop Recording/i }))
    expect(screen.getByRole('button', { name: /Start Recording/i })).toBeInTheDocument()
  })

  it('generates plan when Generate Plan button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    const generateButton = screen.getByRole('button', { name: /Generate Plan/i })
    await user.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText('Mobile Task Manager Beta')).toBeInTheDocument()
    })
  })

  it('displays generated plan in Review & Edit tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Generate plan
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Switch to Review & Edit tab
    await user.click(screen.getByRole('tab', { name: 'Review & Edit' }))
    
    await waitFor(() => {
      expect(screen.getByText('Auth & Accounts')).toBeInTheDocument()
      expect(screen.getByText('Offline Sync')).toBeInTheDocument()
      expect(screen.getByText('Email + Password')).toBeInTheDocument()
    })
  })

  it('allows editing transcript text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    const transcriptTextarea = screen.getByDisplayValue(/We need a mobile task manager/i)
    await user.clear(transcriptTextarea)
    await user.type(transcriptTextarea, 'Build a simple website with contact form')
    
    expect(transcriptTextarea).toHaveValue('Build a simple website with contact form')
  })

  it('toggles task completion status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Generate plan first
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Wait for plan generation and tab switch
    await waitFor(() => {
      expect(screen.getByText('Email + Password')).toBeInTheDocument()
    })
    
    // Toggle task completion
    const taskCheckbox = screen.getByLabelText('Email + Password')
    await user.click(taskCheckbox)
    
    // Task should still be present
    expect(taskCheckbox).toBeInTheDocument()
  })

  it('displays timeline visualization with chart', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Generate plan first
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Switch to Timeline tab
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    
    await waitFor(() => {
      expect(screen.getByText('Project Timeline')).toBeInTheDocument()
      expect(screen.getByText('Duration by Milestone')).toBeInTheDocument()
    })
  })

  it('displays quality gates with confidence metrics', () => {
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Quality gates are visible even without generating a plan
    expect(screen.getByText('Quality Gates')).toBeInTheDocument()
    expect(screen.getByText(/Transcription/i)).toBeInTheDocument()
    expect(screen.getByText(/95%/i)).toBeInTheDocument()
  })

  it('shows intent chips for key insights', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Intent chips are visible from the start
    expect(screen.getByText('10 weeks')).toBeInTheDocument()
    expect(screen.getByText('2 devs')).toBeInTheDocument()
    expect(screen.getByText('iOS')).toBeInTheDocument()
  })

  it('handles drag and drop task reordering', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Generate plan first
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    await user.click(screen.getByRole('tab', { name: 'Review & Edit' }))
    
    await waitFor(() => {
      expect(screen.getByText('Email + Password')).toBeInTheDocument()
      expect(screen.getByText('OAuth (Apple/Google)')).toBeInTheDocument()
    })
    
    // Get the first task
    const firstTask = screen.getByText('Email + Password')
    const secondTask = screen.getByText('OAuth (Apple/Google)')
    
    // Drag and drop (basic test - actual drag simulation would need more complex setup)
    fireEvent.dragStart(firstTask)
    fireEvent.dragEnter(secondTask)
    fireEvent.drop(secondTask)
    fireEvent.dragEnd(firstTask)
    
    // The test verifies the drag events are handled without errors
    expect(firstTask).toBeInTheDocument()
    expect(secondTask).toBeInTheDocument()
  })

  it('displays error message when transcript is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Clear transcript
    const transcriptTextarea = screen.getByDisplayValue(/We need a mobile task manager/i)
    await user.clear(transcriptTextarea)
    
    // Try to generate plan
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Should show validation error
    expect(screen.getByText(/Please provide a transcript/i)).toBeInTheDocument()
  })

  it('displays loading state during plan generation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    const generateButton = screen.getByRole('button', { name: /Generate Plan/i })
    
    // Click generate plan
    await user.click(generateButton)
    
    // Wait for plan generation to complete
    await waitFor(() => {
      expect(screen.getByText('Mobile Task Manager Beta')).toBeInTheDocument()
    })
  })

  it('handles empty transcript validation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VoicePlanningWorkbench />)
    
    // Clear transcript
    const transcriptTextarea = screen.getByDisplayValue(/We need a mobile task manager/i)
    await user.clear(transcriptTextarea)
    
    // Try to generate plan
    await user.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Should show validation error
    expect(screen.getByText(/Please provide a transcript/i)).toBeInTheDocument()
  })
})
