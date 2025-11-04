import { test, expect } from '@playwright/test'

test.describe('Voice Planning Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/voice')
  })

  test('should load the voice planning workbench', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Voice Planning Workbench' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Review & Edit' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible()
  })

  test('should display demo transcript by default', async ({ page }) => {
    const transcript = page.getByLabel('Transcript')
    await expect(transcript).toBeVisible()
    await expect(transcript).toContainText('We need a mobile task manager')
  })

  test('should allow editing transcript', async ({ page }) => {
    const transcript = page.getByLabel('Transcript')
    await transcript.clear()
    await transcript.fill('Build a simple landing page with contact form')
    
    expect(await transcript.inputValue()).toBe('Build a simple landing page with contact form')
  })

  test('should switch between tabs', async ({ page }) => {
    // Start on Voice Input tab
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toHaveAttribute('aria-selected', 'true')
    
    // Switch to Review & Edit tab
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    await expect(page.getByRole('tab', { name: 'Review & Edit' })).toHaveAttribute('aria-selected', 'true')
    
    // Switch to Timeline tab
    await page.getByRole('tab', { name: 'Timeline' }).click()
    await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should generate plan from transcript', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Wait for plan generation
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
    
    // Switch to Review & Edit tab to see generated plan
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    
    await expect(page.getByText('Design & Planning')).toBeVisible()
    await expect(page.getByText('iOS Development')).toBeVisible()
    await expect(page.getByText('Create wireframes')).toBeVisible()
  })

  test('should display quality gates metrics', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    await expect(page.getByText('Quality Gates')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Transcription Confidence')).toBeVisible()
    await expect(page.getByText('95%')).toBeVisible()
    await expect(page.getByText('Intent Extraction')).toBeVisible()
    await expect(page.getByText('85%')).toBeVisible()
  })

  test('should show intent chips', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    await expect(page.getByText('10 weeks')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('2 devs')).toBeVisible()
    await expect(page.getByText('1 designer')).toBeVisible()
    await expect(page.getByText('iOS')).toBeVisible()
  })

  test('should toggle task completion status', async ({ page }) => {
    // Generate plan first
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    
    // Wait for tasks to load
    await expect(page.getByText('Create wireframes')).toBeVisible({ timeout: 10000 })
    
    // Toggle first task
    const firstTaskCheckbox = page.getByLabel('Create wireframes')
    await firstTaskCheckbox.click()
    await expect(firstTaskCheckbox).toBeChecked()
    
    // Toggle again to uncheck
    await firstTaskCheckbox.click()
    await expect(firstTaskCheckbox).not.toBeChecked()
  })

  test('should display timeline visualization', async ({ page }) => {
    // Generate plan first
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await page.getByRole('tab', { name: 'Timeline' }).click()
    
    await expect(page.getByText('Project Timeline')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Duration by Milestone')).toBeVisible()
    
    // Check for chart elements
    await expect(page.locator('text=Design & Planning')).toBeVisible()
    await expect(page.locator('text=iOS Development')).toBeVisible()
  })

  test('should handle empty transcript validation', async ({ page }) => {
    const transcript = page.getByLabel('Transcript')
    await transcript.clear()
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    await expect(page.getByText('Please provide a transcript')).toBeVisible()
  })

  test('should show loading state during plan generation', async ({ page }) => {
    // Mock slower response for this test
    await page.route('**/api/voice/generate-plan', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Should show loading state
    await expect(page.getByText('Generating plan...')).toBeVisible()
    
    // Wait for completion
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 15000 })
  })

  test('should handle transcription errors gracefully', async ({ page }) => {
    // Mock transcription failure
    await page.route('**/api/voice/transcribe', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Transcription service unavailable' })
      })
    })
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    await expect(page.getByText('Failed to transcribe audio')).toBeVisible({ timeout: 10000 })
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check mobile layout
    await expect(page.getByRole('heading', { name: 'Voice Planning Workbench' })).toBeVisible()
    
    // Tabs should be stacked or scrollable on mobile
    const tabsContainer = page.locator('[role="tablist"]').first()
    await expect(tabsContainer).toBeVisible()
    
    // Generate plan on mobile
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Test keyboard navigation through tabs
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toBeFocused()
    
    // Navigate to next tab
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: 'Review & Edit' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate to transcript area
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Transcript')).toBeFocused()
  })

  test('should persist plan data when switching tabs', async ({ page }) => {
    // Generate plan
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
    
    // Switch to Review & Edit tab
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    await expect(page.getByText('Create wireframes')).toBeVisible()
    
    // Switch to Timeline tab
    await page.getByRole('tab', { name: 'Timeline' }).click()
    await expect(page.getByText('Project Timeline')).toBeVisible()
    
    // Switch back to Review & Edit tab
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    await expect(page.getByText('Create wireframes')).toBeVisible()
    
    // Plan data should persist
    await expect(page.getByText('Design & Planning')).toBeVisible()
  })

  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true)
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Should show network error
    await expect(page.getByText(/network|connection|offline/i)).toBeVisible({ timeout: 10000 })
    
    // Go back online
    await page.context().setOffline(false)
    
    // Should work again
    await page.reload()
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
  })

  test('should handle large transcripts', async ({ page }) => {
    const largeTranscript = `
      We need to build a comprehensive enterprise resource planning (ERP) system with multiple modules.
      The system should include financial management, human resources, supply chain management, 
      customer relationship management, inventory management, project management, reporting and analytics,
      business intelligence, document management, workflow automation, compliance tracking, 
      audit trails, multi-currency support, multi-language support, role-based access control,
      API integrations, mobile applications, real-time notifications, data warehousing, 
      advanced security features, disaster recovery, and high availability clustering.
      The project should be completed in 18 months with a team of 15 developers, 
      5 designers, 3 project managers, and 2 QA engineers. We need to support 
      10,000 concurrent users with 99.9% uptime. The technology stack should include 
      microservices architecture, containerization, cloud deployment, and progressive web apps.
    `.trim()
    
    const transcript = page.getByLabel('Transcript')
    await transcript.clear()
    await transcript.fill(largeTranscript)
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Should handle large transcript without crashing
    await expect(page.getByText('Generating plan...')).toBeVisible()
    await expect(page.getByText(/Enterprise Resource Planning|ERP System/i)).toBeVisible({ timeout: 15000 })
  })
})
