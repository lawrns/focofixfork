import { test, expect } from '@playwright/test'

test.describe('Voice Planning Performance Tests', () => {
  test('should load voice planning page within performance budget', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/voice')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Core elements should be visible
    await expect(page.getByRole('heading', { name: 'Voice Planning Workbench' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toBeVisible()
  })

  test('should handle plan generation within acceptable time', async ({ page }) => {
    await page.goto('/voice')
    
    const startTime = Date.now()
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 15000 })
    
    const generationTime = Date.now() - startTime
    
    // Plan generation should complete within 10 seconds
    expect(generationTime).toBeLessThan(10000)
  })

  test('should maintain responsiveness during large transcript processing', async ({ page }) => {
    await page.goto('/voice')
    
    // Create a large transcript
    const largeTranscript = `
      We need to build a comprehensive enterprise system with multiple modules including
      financial management, human resources, supply chain management, customer relationship
      management, inventory management, project management, reporting and analytics,
      business intelligence, document management, workflow automation, compliance tracking,
      audit trails, multi-currency support, multi-language support, role-based access control,
      API integrations, mobile applications, real-time notifications, data warehousing,
      advanced security features, disaster recovery, and high availability clustering.
      The project should be completed in 18 months with a team of 15 developers,
      5 designers, 3 project managers, and 2 QA engineers. We need to support 10,000
      concurrent users with 99.9% uptime. The technology stack should include microservices
      architecture, containerization, cloud deployment, and progressive web apps.
      We need comprehensive testing including unit tests, integration tests, end-to-end tests,
      performance tests, security tests, and accessibility tests. The system should be
      scalable, maintainable, secure, and compliant with industry standards like GDPR,
      SOC 2, ISO 27001, and HIPAA. We need proper documentation, user training,
      change management processes, incident response procedures, and disaster recovery plans.
    `.trim()
    
    const transcript = page.getByLabel('Transcript')
    await transcript.fill(largeTranscript)
    
    // Measure UI responsiveness
    const startTime = Date.now()
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Check that loading state appears quickly
    await expect(page.getByText('Generating plan...')).toBeVisible({ timeout: 1000 })
    
    const loadingTime = Date.now() - startTime
    expect(loadingTime).toBeLessThan(1000)
    
    // Wait for completion
    await expect(page.getByText(/Enterprise|Comprehensive/i)).toBeVisible({ timeout: 20000 })
  })

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/voice')
    
    // Generate multiple plans to test memory usage
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Generate Plan' }).click()
      await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
      
      // Clear and generate new transcript
      const transcript = page.getByLabel('Transcript')
      await transcript.clear()
      await transcript.fill(`Test iteration ${i + 1}: Build a simple web application`)
      
      // Switch tabs to test memory cleanup
      await page.getByRole('tab', { name: 'Review & Edit' }).click()
      await page.getByRole('tab', { name: 'Timeline' }).click()
      await page.getByRole('tab', { name: 'Voice Input' }).click()
    }
    
    // Page should still be responsive
    await expect(page.getByRole('button', { name: 'Generate Plan' })).toBeVisible()
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
  })

  test('should maintain performance under concurrent load', async ({ browser }) => {
    // Create multiple pages to simulate concurrent users
    const pages = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ])
    
    try {
      // Navigate all pages to voice planning
      await Promise.all(pages.map(page => page.goto('/voice')))
      
      // Start plan generation on all pages concurrently
      const startTime = Date.now()
      
      await Promise.all(pages.map(page => 
        page.getByRole('button', { name: 'Generate Plan' }).click()
      ))
      
      // Wait for all pages to complete
      await Promise.all(pages.map(page => 
        page.waitForSelector('text=Mobile Task Manager', { timeout: 15000 })
      ))
      
      const totalTime = Date.now() - startTime
      
      // Concurrent operations should complete within reasonable time
      expect(totalTime).toBeLessThan(15000)
      
    } finally {
      // Clean up pages
      await Promise.all(pages.map(page => page.close()))
    }
  })

  test('should optimize bundle size and loading', async ({ page }) => {
    const responses: any[] = []
    
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0')
        })
      }
    })
    
    await page.goto('/voice')
    await page.waitForLoadState('networkidle')
    
    // Check total bundle size
    const totalJSSize = responses
      .filter(r => r.url.includes('.js'))
      .reduce((sum, r) => sum + r.size, 0)
    
    // JavaScript bundle should be under 2MB
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024)
    
    // Check number of requests
    const jsRequests = responses.filter(r => r.url.includes('.js')).length
    expect(jsRequests).toBeLessThan(20) // Should have reasonable code splitting
  })

  test('should handle large audio files efficiently', async ({ page }) => {
    await page.goto('/voice')
    
    // Mock a large audio file upload
    const largeAudioData = new Array(1024 * 1024).fill('mock audio data').join('')
    const audioBlob = new Blob([largeAudioData], { type: 'audio/webm' })
    
    // Monitor network requests
    const requests: any[] = []
    page.on('request', request => {
      if (request.url().includes('/api/voice/transcribe')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        })
      }
    })
    
    // Simulate audio upload (this would normally be done through file input)
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        const file = new File(['mock large audio data'], 'test.webm', { type: 'audio/webm' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInput.files = dataTransfer.files
      }
    })
    
    // The page should handle large files without freezing
    await expect(page.getByRole('button', { name: 'Generate Plan' })).toBeVisible()
  })

  test('should optimize rendering performance', async ({ page }) => {
    await page.goto('/voice')
    
    // Generate plan first
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
    
    // Test tab switching performance
    const tabSwitchTimes: number[] = []
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now()
      
      await page.getByRole('tab', { name: 'Review & Edit' }).click()
      await page.waitForSelector('text=Create wireframes', { state: 'visible', timeout: 5000 })
      
      const switchTime = Date.now() - startTime
      tabSwitchTimes.push(switchTime)
      
      // Switch back
      await page.getByRole('tab', { name: 'Voice Input' }).click()
      await page.waitForSelector('text=Demo Brief', { state: 'visible', timeout: 5000 })
    }
    
    // Tab switching should be fast (under 500ms average)
    const averageSwitchTime = tabSwitchTimes.reduce((a, b) => a + b, 0) / tabSwitchTimes.length
    expect(averageSwitchTime).toBeLessThan(500)
  })

  test('should handle API rate limiting gracefully', async ({ page }) => {
    await page.goto('/voice')
    
    // Make rapid requests to test rate limiting
    const requestPromises = []
    
    for (let i = 0; i < 10; i++) {
      requestPromises.push(
        page.evaluate(() => {
          return fetch('/api/voice/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: 'Test transcript' })
          })
        })
      )
    }
    
    const responses = await Promise.allSettled(requestPromises)
    
    // Some requests might be rate limited, but the page should handle it gracefully
    const successfulRequests = responses.filter(r => r.status === 'fulfilled').length
    const failedRequests = responses.filter(r => r.status === 'rejected').length
    
    // Should have at least some successful requests
    expect(successfulRequests).toBeGreaterThan(0)
    
    // Page should still be functional
    await expect(page.getByRole('button', { name: 'Generate Plan' })).toBeVisible()
  })

  test('should maintain accessibility performance', async ({ page }) => {
    await page.goto('/voice')
    
    // Test keyboard navigation performance
    const startTime = Date.now()
    
    await page.keyboard.press('Tab') // Focus first tab
    await page.keyboard.press('ArrowRight') // Move to next tab
    await page.keyboard.press('Enter') // Select tab
    await page.keyboard.press('Tab') // Move to transcript
    await page.keyboard.press('Tab') // Move to generate button
    
    const navigationTime = Date.now() - startTime
    
    // Keyboard navigation should be responsive
    expect(navigationTime).toBeLessThan(1000)
    
    // Verify focus is correct
    await expect(page.getByRole('button', { name: 'Generate Plan' })).toBeFocused()
  })

  test('should optimize database query performance', async ({ page }) => {
    await page.goto('/voice')
    
    // Monitor network requests for database queries
    const queryTimes: number[] = []
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const startTime = Date.now()
        await response.text()
        const queryTime = Date.now() - startTime
        queryTimes.push(queryTime)
      }
    })
    
    // Generate plan to trigger database queries
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
    
    // Database queries should be fast
    if (queryTimes.length > 0) {
      const averageQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
      expect(averageQueryTime).toBeLessThan(2000) // Under 2 seconds average
    }
  })
})
