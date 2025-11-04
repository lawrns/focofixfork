import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
}

const testVoiceInput = {
  text: 'Create a mobile app with user authentication and assign to John Doe',
  expectedIntent: 'create_plan',
  expectedEntities: ['mobile app', 'user authentication', 'John Doe']
}

const testProject = {
  title: 'Mobile App Development',
  description: 'Create a mobile app with user authentication',
  priority: 'high'
}

describe('Voice Planning Flow', () => {
  let page: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test.beforeEach(async () => {
    await page.goto('/voice')
  })

  describe('Authentication and Setup', () => {
    test('should allow user to login and access voice planning', async () => {
      // Navigate to login
      await page.click('[data-testid="login-button"]')
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.click('[data-testid="submit-login"]')
      
      // Should redirect to voice planning dashboard
      await expect(page).toHaveURL('/voice/dashboard')
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testUser.name)
    })

    test('should display voice planning features after login', async () => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.click('[data-testid="submit-login"]')
      
      // Check voice planning components are visible
      await expect(page.locator('[data-testid="voice-capture-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="transcription-display"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-preview"]')).toBeVisible()
      await expect(page.locator('[data-testid="feature-flags"]')).toBeVisible()
    })
  })

  describe('Voice Capture and Transcription', () => {
    test('should capture voice input and display transcription', async () => {
      // Mock microphone permission
      await page.context().grantPermissions(['microphone'])
      
      // Start voice capture
      await page.click('[data-testid="voice-capture-button"]')
      
      // Should show recording indicator
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="recording-timer"]')).toBeVisible()
      
      // Mock audio input (in real test, would use actual audio)
      await page.evaluate(() => {
        // Mock the Web Audio API
        window.AudioContext = class MockAudioContext {
          createMediaStreamSource() {
            return {
              connect: () => {},
              disconnect: () => {}
            }
          }
        }
        
        // Mock transcription completion
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-complete', {
            detail: {
              text: 'Create a mobile app with user authentication',
              confidence: 0.95,
              language: 'en'
            }
          }))
        }, 2000)
      })
      
      // Wait for transcription to complete
      await page.waitForSelector('[data-testid="transcription-result"]')
      
      // Should display transcription
      await expect(page.locator('[data-testid="transcription-result"]')).toContainText('Create a mobile app')
      await expect(page.locator('[data-testid="confidence-score"]')).toContainText('95%')
    })

    test('should handle transcription errors gracefully', async () => {
      // Mock transcription error
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-error', {
            detail: {
              error: 'Speech recognition service unavailable'
            }
          }))
        }, 1000)
      })
      
      await page.click('[data-testid="voice-capture-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Speech recognition service unavailable')
      
      // Should allow retry
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should allow manual text input as fallback', async () => {
      // Click manual input option
      await page.click('[data-testid="manual-input-button"]')
      
      // Should show text input field
      await expect(page.locator('[data-testid="manual-text-input"]')).toBeVisible()
      
      // Enter text manually
      await page.fill('[data-testid="manual-text-input"]', testVoiceInput.text)
      await page.click('[data-testid="submit-manual-input"]')
      
      // Should process the manual input
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible()
    })
  })

  describe('Intent Extraction and Plan Generation', () => {
    test('should extract intent and generate plan from voice input', async () => {
      // Mock successful transcription
      await page.evaluate((text) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-complete', {
            detail: {
              text: text,
              confidence: 0.95,
              language: 'en'
            }
          }))
        }, 1000)
      }, testVoiceInput.text)
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="transcription-result"]')
      
      // Should show intent extraction
      await expect(page.locator('[data-testid="intent-result"]')).toBeVisible()
      await expect(page.locator('[data-testid="intent-result"]')).toContainText(testVoiceInput.expectedIntent)
      
      // Should show extracted entities
      await expect(page.locator('[data-testid="entities-list"]')).toBeVisible()
      testVoiceInput.expectedEntities.forEach(entity => {
        expect(page.locator('[data-testid="entities-list"]')).toContainText(entity)
      })
      
      // Should generate plan
      await page.waitForSelector('[data-testid="generated-plan"]')
      await expect(page.locator('[data-testid="generated-plan"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-title"]')).toContainText(testProject.title)
    })

    test('should display confidence scores and allow user confirmation', async () => {
      // Mock transcription with lower confidence
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-complete', {
            detail: {
              text: 'maybe create something for mobile',
              confidence: 0.65,
              language: 'en'
            }
          }))
        }, 1000)
      })
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="intent-result"]')
      
      // Should show confidence indicator
      await expect(page.locator('[data-testid="confidence-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="confidence-warning"]')).toBeVisible()
      
      // Should allow user to edit or confirm
      await expect(page.locator('[data-testid="edit-intent-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="confirm-intent-button"]')).toBeVisible()
    })

    test('should allow plan editing before commit', async () => {
      // Wait for plan generation
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('plan-generated', {
            detail: {
              plan: {
                title: 'Generated Plan',
                milestones: [
                  {
                    title: 'Design Phase',
                    tasks: [
                      { title: 'Create wireframes', priority: 'high' }
                    ]
                  }
                ]
              }
            }
          }))
        }, 2000)
      })
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="generated-plan"]')
      
      // Click edit plan
      await page.click('[data-testid="edit-plan-button"]')
      
      // Should open plan editor
      await expect(page.locator('[data-testid="plan-editor"]')).toBeVisible()
      await expect(page.locator('[data-testid="milestone-list"]')).toBeVisible()
      
      // Edit milestone title
      await page.fill('[data-testid="milestone-title-input"]', 'Updated Design Phase')
      
      // Add new task
      await page.click('[data-testid="add-task-button"]')
      await page.fill('[data-testid="new-task-input"]', 'User research')
      await page.click('[data-testid="save-task-button"]')
      
      // Save changes
      await page.click('[data-testid="save-plan-changes"]')
      
      // Should show updated plan
      await expect(page.locator('[data-testid="milestone-title"]')).toContainText('Updated Design Phase')
      await expect(page.locator('[data-testid="task-list"]')).toContainText('User research')
    })
  })

  describe('Plan Review and Commit', () => {
    test('should display plan review panel with timeline', async () => {
      // Generate a plan first
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('plan-generated', {
            detail: {
              plan: {
                title: 'Test Project',
                milestones: [
                  {
                    title: 'Phase 1',
                    targetDate: '2024-02-01',
                    tasks: [
                      { title: 'Task 1', estimatedDuration: 5 },
                      { title: 'Task 2', estimatedDuration: 3 }
                    ]
                  }
                ]
              }
            }
          }))
        }, 1000)
      })
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="generated-plan"]')
      
      // Click review plan
      await page.click('[data-testid="review-plan-button"]')
      
      // Should show plan review panel
      await expect(page.locator('[data-testid="plan-review-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-timeline"]')).toBeVisible()
      await expect(page.locator('[data-testid="dependency-visualization"]')).toBeVisible()
      
      // Should show project summary
      await expect(page.locator('[data-testid="project-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="task-count"]')).toContainText('2')
      await expect(page.locator('[data-testid="milestone-count"]')).toContainText('1')
    })

    test('should allow task reordering and dependency management', async () => {
      await page.click('[data-testid="review-plan-button"]')
      await expect(page.locator('[data-testid="plan-review-panel"]')).toBeVisible()
      
      // Reorder tasks
      await page.click('[data-testid="move-task-up"]')
      await page.click('[data-testid="move-task-down"]')
      
      // Add dependency
      await page.click('[data-testid="add-dependency-button"]')
      await page.selectOption('[data-testid="dependency-task-select"]', 'task-2')
      await page.click('[data-testid="save-dependency"]')
      
      // Should show dependency link
      await expect(page.locator('[data-testid="dependency-link"]')).toBeVisible()
      
      // Remove dependency
      await page.click('[data-testid="remove-dependency"]')
      await expect(page.locator('[data-testid="dependency-link"]')).not.toBeVisible()
    })

    test('should commit plan and show confirmation', async () => {
      await page.click('[data-testid="review-plan-button"]')
      await expect(page.locator('[data-testid="plan-review-panel"]')).toBeVisible()
      
      // Commit plan
      await page.click('[data-testid="commit-plan-button"]')
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="commit-confirmation"]')).toBeVisible()
      await expect(page.locator('[data-testid="commit-summary"]')).toBeVisible()
      
      // Confirm commit
      await page.click('[data-testid="confirm-commit"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Plan committed successfully')
      
      // Should redirect to project view
      await expect(page).toHaveURL(/\/projects\/.*/)
    })
  })

  describe('Feature Flags and Settings', () => {
    test('should respect feature flag settings', async () => {
      // Navigate to settings
      await page.click('[data-testid="settings-button"]')
      await expect(page.locator('[data-testid="voice-settings"]')).toBeVisible()
      
      // Disable plan orchestration
      await page.uncheck('[data-testid="plan-orchestration-flag"]')
      await page.click('[data-testid="save-settings"]')
      
      // Return to voice capture
      await page.goto('/voice')
      
      // Should show feature disabled message
      await page.click('[data-testid="voice-capture-button"]')
      await expect(page.locator('[data-testid="feature-disabled-message"]')).toContainText('Plan orchestration is disabled')
    })

    test('should allow shadow mode testing', async () => {
      // Enable shadow mode
      await page.goto('/voice/settings')
      await page.check('[data-testid="shadow-mode-flag"]')
      await page.click('[data-testid="save-settings"]')
      
      // Test voice capture in shadow mode
      await page.goto('/voice')
      await page.click('[data-testid="voice-capture-button"]')
      
      // Should show shadow mode indicator
      await expect(page.locator('[data-testid="shadow-mode-indicator"]')).toBeVisible()
      
      // Should not actually commit data
      await expect(page.locator('[data-testid="shadow-mode-notice"]')).toContainText('Running in shadow mode - no data will be saved')
    })
  })

  describe('Privacy and Security', () => {
    test('should show PII detection and redaction', async () => {
      // Mock input with PII
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-complete', {
            detail: {
              text: 'Create project for john@example.com, call (555) 123-4567',
              confidence: 0.95,
              language: 'en'
            }
          }))
        }, 1000)
      })
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="transcription-result"]')
      
      // Should show PII detection
      await expect(page.locator('[data-testid="pii-detected"]')).toBeVisible()
      await expect(page.locator('[data-testid="pii-summary"]')).toContainText('Email address found')
      await expect(page.locator('[data-testid="pii-summary"]')).toContainText('Phone number found')
      
      // Should show redacted text
      await expect(page.locator('[data-testid="redacted-text"]')).toContainText('[EMAIL]')
      await expect(page.locator('[data-testid="redacted-text"]')).toContainText('[PHONE]')
    })

    test('should require consent for data processing', async () => {
      // First time user should see consent dialog
      await expect(page.locator('[data-testid="consent-dialog"]')).toBeVisible()
      await expect(page.locator('[data-testid="consent-text"]')).toContainText('voice data processing')
      
      // Should not allow proceeding without consent
      await page.click('[data-testid="voice-capture-button"]')
      await expect(page.locator('[data-testid="consent-required"]')).toBeVisible()
      
      // Grant consent
      await page.check('[data-testid="consent-checkbox"]')
      await page.click('[data-testid="grant-consent"]')
      
      // Should now allow voice capture
      await page.click('[data-testid="voice-capture-button"]')
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible()
    })
  })

  describe('Accessibility and Responsive Design', () => {
    test('should be accessible via keyboard navigation', async () => {
      // Tab through interface
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Use Enter to activate voice capture
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible()
      
      // Use Escape to stop recording
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible()
    })

    test('should be responsive on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Should adapt layout for mobile
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible()
      await expect(page.locator('[data-testid="voice-capture-button"]')).toBeVisible()
      
      // Should show mobile-specific controls
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
      await page.click('[data-testid="mobile-menu"]')
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
    })

    test('should support screen readers', async () => {
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="voice-capture-button"]')).toHaveAttribute('aria-label')
      await expect(page.locator('[data-testid="transcription-result"]')).toHaveAttribute('aria-live')
      await expect(page.locator('[data-testid="plan-preview"]')).toHaveAttribute('aria-label')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle network connectivity issues', async () => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      await page.click('[data-testid="voice-capture-button"]')
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible()
      
      // Restore connection
      await page.context().setOffline(false)
      await page.click('[data-testid="retry-connection"]')
      
      // Should work again
      await expect(page.locator('[data-testid="offline-message"]')).not.toBeVisible()
    })

    test('should handle microphone permission denial', async () => {
      // Deny microphone permission
      await page.context().clearPermissions()
      
      await page.click('[data-testid="voice-capture-button"]')
      
      // Should show permission denied message
      await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible()
      await expect(page.locator('[data-testid="manual-input-option"]')).toBeVisible()
    })

    test('should handle very long transcriptions', async () => {
      // Mock very long transcription
      const longText = 'Create a comprehensive mobile application '.repeat(100)
      
      await page.evaluate((text) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('transcription-complete', {
            detail: {
              text: text,
              confidence: 0.95,
              language: 'en'
            }
          }))
        }, 1000)
      }, longText)
      
      await page.click('[data-testid="voice-capture-button"]')
      await page.waitForSelector('[data-testid="transcription-result"]')
      
      // Should handle long text gracefully
      await expect(page.locator('[data-testid="transcription-result"]')).toBeVisible()
      await expect(page.locator('[data-testid="text-truncation"]')).toBeVisible()
    })
  })

  describe('Performance and Load Testing', () => {
    test('should load within performance budgets', async () => {
      // Measure page load time
      const startTime = Date.now()
      await page.goto('/voice')
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const vitals = {
              lcp: entries.find(e => e.name === 'largest-contentful-paint')?.startTime || 0,
              fid: entries.find(e => e.name === 'first-input')?.processingStart - entries.find(e => e.name === 'first-input')?.startTime || 0,
              cls: entries.find(e => e.name === 'cumulative-layout-shift')?.value || 0
            }
            resolve(vitals)
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift'] })
        })
      })
      
      // Should meet performance thresholds
      expect(metrics.lcp).toBeLessThan(2500) // Largest Contentful Paint
      expect(metrics.fid).toBeLessThan(100)   // First Input Delay
      expect(metrics.cls).toBeLessThan(0.1)   // Cumulative Layout Shift
    })

    test('should handle rapid consecutive interactions', async () => {
      // Rapidly click voice capture multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="voice-capture-button"]')
        await page.waitForTimeout(100)
      }
      
      // Should not crash or show errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="voice-capture-button"]')).toBeVisible()
    })
  })
})
