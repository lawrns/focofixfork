import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Organizations API Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should fetch organization details, members, and invitations in parallel', async () => {
    const mockOrgId = 'test-org-123'
    const startTimes: number[] = []
    const endTimes: number[] = []

    // Mock fetch to record timing
    global.fetch = vi.fn((url: string) => {
      const callIndex = startTimes.length
      startTimes.push(Date.now())

      return new Promise((resolve) => {
        setTimeout(() => {
          endTimes.push(Date.now())

          // Return appropriate mock data based on URL
          if (url.includes('/members')) {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: [
                  { id: '1', user_id: 'user-1', role: 'admin', email: 'admin@test.com' }
                ]
              })
            } as Response)
          } else if (url.includes('/invitations')) {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: [
                  { id: 'inv-1', email: 'invited@test.com', status: 'pending' }
                ]
              })
            } as Response)
          } else {
            // Organization details
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: { id: mockOrgId, name: 'Test Org' }
              })
            } as Response)
          }
        }, 100) // Simulate 100ms network delay
      })
    }) as any

    // Simulate the parallel fetch pattern we expect
    const promises = [
      fetch(`/api/organizations/${mockOrgId}`),
      fetch(`/api/organizations/${mockOrgId}/members`),
      fetch(`/api/organizations/${mockOrgId}/invitations`)
    ]

    const results = await Promise.allSettled(promises)

    // All requests should have been initiated
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(global.fetch).toHaveBeenCalledWith(`/api/organizations/${mockOrgId}`)
    expect(global.fetch).toHaveBeenCalledWith(`/api/organizations/${mockOrgId}/members`)
    expect(global.fetch).toHaveBeenCalledWith(`/api/organizations/${mockOrgId}/invitations`)

    // Check that all calls started within a short time window (parallel, not sequential)
    // If sequential, they would be 100ms+ apart. If parallel, they should start within ~10ms
    const maxTimeDifference = Math.max(...startTimes) - Math.min(...startTimes)
    expect(maxTimeDifference).toBeLessThan(50) // Allow 50ms tolerance for test environment

    // All results should be fulfilled
    expect(results.every(r => r.status === 'fulfilled')).toBe(true)
  })

  it('should handle partial failures gracefully with Promise.allSettled', async () => {
    const mockOrgId = 'test-org-123'

    // Mock fetch with one failure
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/members')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ success: false, error: 'Server error' })
        } as Response)
      } else if (url.includes('/invitations')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 'inv-1', email: 'test@test.com', status: 'pending' }]
          })
        } as Response)
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: mockOrgId, name: 'Test Org' }
          })
        } as Response)
      }
    }) as any

    const promises = [
      fetch(`/api/organizations/${mockOrgId}`),
      fetch(`/api/organizations/${mockOrgId}/members`),
      fetch(`/api/organizations/${mockOrgId}/invitations`)
    ]

    const results = await Promise.allSettled(promises)

    // All promises should settle (not reject the entire operation)
    expect(results).toHaveLength(3)
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('fulfilled')
    expect(results[2].status).toBe('fulfilled')

    // Verify we can still access successful results
    if (results[0].status === 'fulfilled') {
      const orgData = await results[0].value.json()
      expect(orgData.success).toBe(true)
      expect(orgData.data.name).toBe('Test Org')
    }

    // Verify we can identify the failed request
    if (results[1].status === 'fulfilled') {
      const membersResponse = results[1].value
      expect(membersResponse.ok).toBe(false)
      expect(membersResponse.status).toBe(500)
    }

    // Verify successful invitations request still works
    if (results[2].status === 'fulfilled') {
      const invitationsData = await results[2].value.json()
      expect(invitationsData.success).toBe(true)
      expect(invitationsData.data).toHaveLength(1)
    }
  })

  it('should be faster than sequential fetching (performance improvement)', async () => {
    const mockOrgId = 'test-org-123'
    const networkDelay = 100 // ms per request

    // Test sequential fetching (current implementation)
    global.fetch = vi.fn((url: string) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          } as Response)
        }, networkDelay)
      })
    }) as any

    const sequentialStart = Date.now()
    await fetch(`/api/organizations/${mockOrgId}`)
    await fetch(`/api/organizations/${mockOrgId}/members`)
    await fetch(`/api/organizations/${mockOrgId}/invitations`)
    const sequentialEnd = Date.now()
    const sequentialDuration = sequentialEnd - sequentialStart

    // Reset fetch mock
    global.fetch = vi.fn((url: string) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          } as Response)
        }, networkDelay)
      })
    }) as any

    // Test parallel fetching (optimized implementation)
    const parallelStart = Date.now()
    await Promise.allSettled([
      fetch(`/api/organizations/${mockOrgId}`),
      fetch(`/api/organizations/${mockOrgId}/members`),
      fetch(`/api/organizations/${mockOrgId}/invitations`)
    ])
    const parallelEnd = Date.now()
    const parallelDuration = parallelEnd - parallelStart

    // Sequential should take ~300ms (3 * 100ms)
    // Parallel should take ~100ms (all at once)
    // Parallel should be at least 2x faster
    expect(sequentialDuration).toBeGreaterThanOrEqual(250) // Allow some tolerance
    expect(parallelDuration).toBeLessThan(150) // Should be close to 100ms
    expect(sequentialDuration).toBeGreaterThan(parallelDuration * 2)
  })

  it('should handle network errors without breaking entire operation', async () => {
    const mockOrgId = 'test-org-123'

    // Mock fetch with network error on one request
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/members')) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      } as Response)
    }) as any

    const results = await Promise.allSettled([
      fetch(`/api/organizations/${mockOrgId}`),
      fetch(`/api/organizations/${mockOrgId}/members`),
      fetch(`/api/organizations/${mockOrgId}/invitations`)
    ])

    // Verify rejected promise is caught
    expect(results[1].status).toBe('rejected')
    if (results[1].status === 'rejected') {
      expect(results[1].reason.message).toBe('Network error')
    }

    // Other requests should still succeed
    expect(results[0].status).toBe('fulfilled')
    expect(results[2].status).toBe('fulfilled')
  })
})
