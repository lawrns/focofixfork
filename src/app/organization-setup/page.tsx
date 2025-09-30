'use client'

import { useState, useEffect } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store original router.push to restore later
  const originalPush = router.push

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

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      // Restore original router.push
      router.push = originalPush
      navigationBlocked = false
    }
  }, [user, loading, router, originalPush])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!organizationName.trim()) {
      setError('Organization name is required')
      return
    }

    if (!user) {
      setError('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/organization-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          userId: user.id
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Clear navigation blocker
        navigationBlocked = false

        // Restore router.push
        router.push = originalPush

        // Redirect to dashboard after successful setup
        router.push('/dashboard')
      } else {
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
                Organization Name
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
