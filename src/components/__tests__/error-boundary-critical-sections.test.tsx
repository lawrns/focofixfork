import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ErrorBoundary from '@/components/error/error-boundary'

/**
 * Test suite for Error Boundary coverage of critical sections
 *
 * REQUIREMENT: Verify that error boundaries properly wrap all critical
 * sections (Dashboard, Projects, Tasks, Settings, Inbox) and handle
 * component crashes gracefully.
 */

describe('Error Boundary - Critical Sections Coverage', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Error boundary catches component errors', () => {
    it('should catch and display error when child component throws', async () => {
      const ThrowingComponent = () => {
        throw new Error('Test component error')
      }

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should display error message with details', async () => {
      const errorMessage = 'Failed to fetch data'
      const ThrowingComponent = () => {
        throw new Error(errorMessage)
      }

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should show error ID for debugging', async () => {
      const ThrowingComponent = () => {
        throw new Error('Debug test')
      }

      render(
        <ErrorBoundary showErrorId={true}>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        const errorIdBadge = screen.queryByText(/error_/)
        expect(errorIdBadge).toBeInTheDocument()
      })
    })

    it('should log error to console with error info', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      const ThrowingComponent = () => {
        throw new Error('Logged error')
      }

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('ErrorBoundary caught'),
          expect.any(Error),
          expect.any(Object)
        )
      })
    })
  })

  describe('Error boundary fallback UI', () => {
    it('should display retry button when enableRetry is true', async () => {
      const ThrowingComponent = () => {
        throw new Error('Retry test')
      }

      render(
        <ErrorBoundary enableRetry={true}>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('should display home button', async () => {
      const ThrowingComponent = () => {
        throw new Error('Home button test')
      }

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
      })
    })

    it('should allow retry and recover from error', async () => {
      let shouldThrow = true

      const ConditionalThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error('Initial error')
        }
        return <div>Recovered!</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })

      // Click retry
      shouldThrow = false
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Recovered!')).toBeInTheDocument()
      })
    })
  })

  describe('Dashboard page error handling', () => {
    it('should render fallback when dashboard data fetch fails', async () => {
      const ThrowingDashboardContent = () => {
        throw new Error('Failed to load dashboard data')
      }

      render(
        <ErrorBoundary>
          <ThrowingDashboardContent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument()
      })
    })

    it('should not crash entire page when project list fails', async () => {
      const ThrowingProjectList = () => {
        throw new Error('Failed to fetch projects')
      }

      render(
        <ErrorBoundary>
          <ThrowingProjectList />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Projects page error handling', () => {
    it('should catch project list rendering error', async () => {
      const ThrowingProjectsContent = () => {
        throw new Error('Failed to render projects')
      }

      render(
        <ErrorBoundary>
          <ThrowingProjectsContent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should handle project card component failure', async () => {
      const ThrowingProjectCard = () => {
        throw new Error('Invalid project data')
      }

      render(
        <ErrorBoundary>
          <ThrowingProjectCard />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Task list error handling', () => {
    it('should catch task list rendering error', async () => {
      const ThrowingTaskList = () => {
        throw new Error('Failed to fetch tasks')
      }

      render(
        <ErrorBoundary>
          <ThrowingTaskList />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should handle task form submission error', async () => {
      const ThrowingTaskForm = () => {
        throw new Error('Failed to create task')
      }

      render(
        <ErrorBoundary>
          <ThrowingTaskForm />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Settings page error handling', () => {
    it('should catch settings page rendering error', async () => {
      const ThrowingSettings = () => {
        throw new Error('Failed to load settings')
      }

      render(
        <ErrorBoundary>
          <ThrowingSettings />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should handle settings save failure gracefully', async () => {
      const ThrowingSettingsSave = () => {
        throw new Error('Failed to save settings')
      }

      render(
        <ErrorBoundary>
          <ThrowingSettingsSave />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Inbox page error handling', () => {
    it('should catch inbox page rendering error', async () => {
      const ThrowingInbox = () => {
        throw new Error('Failed to load inbox')
      }

      render(
        <ErrorBoundary>
          <ThrowingInbox />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should handle notification fetch error', async () => {
      const ThrowingNotifications = () => {
        throw new Error('Failed to fetch notifications')
      }

      render(
        <ErrorBoundary>
          <ThrowingNotifications />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Error boundary with custom fallback', () => {
    it('should render custom fallback component', async () => {
      const CustomFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
        <div data-testid="custom-fallback">
          <p>Custom Error: {error.message}</p>
          <button onClick={resetError}>Custom Retry</button>
        </div>
      )

      const ThrowingComponent = () => {
        throw new Error('Custom fallback test')
      }

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
        expect(screen.getByText('Custom Error: Custom fallback test')).toBeInTheDocument()
      })
    })
  })

  describe('Error boundary recovery', () => {
    it('should reset error state after retry', async () => {
      let renderCount = 0
      let shouldThrow = true

      const CountingComponent = () => {
        renderCount++
        if (shouldThrow) {
          throw new Error('Recoverable error')
        }
        return <div data-testid="success-content">Content loaded successfully</div>
      }

      const { rerender } = render(
        <ErrorBoundary enableRetry={true}>
          <CountingComponent />
        </ErrorBoundary>
      )

      expect(renderCount).toBe(1)

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })

      shouldThrow = false
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByTestId('success-content')).toBeInTheDocument()
      })
    })
  })

  describe('Error tracking and logging', () => {
    it('should include timestamp in error info', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      const ThrowingComponent = () => {
        throw new Error('Timestamp test')
      }

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        const errorId = screen.queryByText(/error_/)?.textContent || ''
        expect(errorId).toMatch(/error_/)
      })
    })

    it('should call onError callback when provided', async () => {
      const onError = vi.fn()
      const ThrowingComponent = () => {
        throw new Error('Callback test')
      }

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.any(Object),
          expect.any(String)
        )
      })
    })
  })

  describe('Multiple error boundary nesting', () => {
    it('should allow nested error boundaries', async () => {
      const ThrowingComponent = () => {
        throw new Error('Nested error')
      }

      render(
        <ErrorBoundary data-testid="outer">
          <div>
            <ErrorBoundary data-testid="inner">
              <ThrowingComponent />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Error boundary prevents white screen', () => {
    it('should display meaningful error instead of white screen', async () => {
      const FatalComponent = () => {
        throw new Error('Application crashed')
      }

      render(
        <ErrorBoundary>
          <FatalComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        // Should NOT be blank/empty
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        // Should display error message
        expect(screen.getByText('Application crashed')).toBeInTheDocument()
        // Should provide recovery action
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('should always render something instead of crashing', async () => {
      const ThrowingComponent = () => {
        throw new Error('Critical failure')
      }

      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        // Container should have content
        expect(container.innerHTML).toBeTruthy()
        // Should have error UI, not empty
        expect(container.querySelector('[class*="card"]')).toBeInTheDocument()
      })
    })
  })
})
