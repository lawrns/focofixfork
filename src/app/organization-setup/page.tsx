'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Global navigation blocker for organization setup
let navigationBlocked = false

export default function OrganizationSetupPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [organizationName, setOrganizationName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store original router.push to restore later
  const originalPush = router.push

  // Store cleanup function reference so it can be called on success
  const cleanupRef = useRef<(() => void) | null>(null)

  // Store event listener functions so they can be removed
  const beforeUnloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null)
  const popStateRef = useRef<((e: PopStateEvent) => void) | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    // Prevent navigation away from this page
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You must complete organization setup to continue using Foco.'
    }

    const handlePopState = (e: PopStateEvent) => {
      // Prevent back/forward navigation
      window.history.pushState(null, '', window.location.href)
      alert('Please complete organization setup before navigating away.')
    }

    // Store event listeners in refs
    beforeUnloadRef.current = handleBeforeUnload
    popStateRef.current = handlePopState

    // Override browser back button
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    // Block navigation globally
    navigationBlocked = true

    // Override router.push to prevent navigation
    router.push = (...args: any[]) => {
      console.warn('Navigation blocked: Please complete organization setup first')
      alert('Please complete organization setup before navigating away.')
      return Promise.resolve(false)
    }

    // Store cleanup function in ref so it can be called on success
    cleanupRef.current = () => {
      console.log('Running cleanup function')
      if (beforeUnloadRef.current) {
        window.removeEventListener('beforeunload', beforeUnloadRef.current)
      }
      if (popStateRef.current) {
        window.removeEventListener('popstate', popStateRef.current)
      }
      // Restore original router.push
      router.push = originalPush
      navigationBlocked = false
      console.log('Cleanup completed')
    }

    console.log('Navigation blocking setup complete, cleanupRef.current:', cleanupRef.current)

    return cleanupRef.current
  }, [user, loading, router, originalPush])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('handleSubmit called')

    if (!organizationName.trim()) {
      console.log('Organization name validation failed')
      setError('Organization name is required')
      return
    }

    if (!user) {
      console.log('User authentication check failed')
      setError('User not authenticated')
      return
    }

    // Validate website URL if provided
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      console.log('Website URL validation failed')
      setError('Website must be a valid URL starting with http:// or https://')
      return
    }

    console.log('Starting organization setup API call')
    setIsLoading(true)
    setError(null)

    try {
      console.log('Making fetch request to /api/organization-setup')
      const response = await fetch('/api/organization-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          description: description.trim(),
          website: website.trim(),
          userId: user.id
        }),
      })

      console.log('Fetch response status:', response.status)

      if (!response.ok) {
        console.log('Response not OK, status:', response.status)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('Parsing JSON response')
      const result = await response.json()

      console.log('Organization setup API response:', result)

      if (result.success) {
        console.log('Organization setup successful, clearing navigation blockers')

        // Clear all navigation blockers using the cleanup function
        if (cleanupRef.current) {
          cleanupRef.current()
          console.log('Navigation blockers cleared via cleanup function')
        }

        // Redirect to dashboard after successful setup
        console.log('Redirecting to dashboard...')
        // Use window.location to bypass router overrides
        window.location.href = '/dashboard'
      } else {
        console.log('Organization setup failed:', result.error)
        setError(result.error || 'Failed to create organization')
      }
    } catch (error) {
      console.error('Organization setup error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-xl p-8 mx-4">
        <div className="space-y-6">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Setup Your Organization
            </h1>
            <p className="text-muted-foreground text-base">
              Create your organization to get started with Foco
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="organizationName" className="text-sm font-medium text-foreground">
                Organization Name *
              </Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value)
                  if (error) setError(null)
                }}
                required
                disabled={isLoading}
                autoComplete="organization"
                className="h-12 px-4 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium text-foreground">
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                placeholder="Brief description of your organization (optional)"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
                rows={3}
                className="w-full px-4 py-3 text-base border border-input rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="website" className="text-sm font-medium text-foreground">
                Website
              </Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://your-organization.com"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isLoading}
                autoComplete="url"
                className="h-12 px-4 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Your organization&apos;s website URL
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading || !organizationName.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Create Organization
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This step is required to continue using Foco
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
