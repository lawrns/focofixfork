'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

// Apple Icon Component
const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function RegisterForm({ onSuccess, redirectTo = '/dashboard' }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    const token = searchParams.get('invitation')
    if (token) {
      setInvitationToken(token)
      validateInvitation(token)
    }
  }, [searchParams])

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/${token}/validate`)
      const result = await response.json()

      if (result.success) {
        setInvitationData(result.data)
        // Pre-fill email if available
        if (result.data.email) {
          setFormData(prev => ({ ...prev, email: result.data.email }))
        }
      } else {
        setError('Invalid or expired invitation')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    }
  }

  const acceptInvitation = async (userId: string) => {
    if (!invitationToken) return

    try {
      const response = await fetch(`/api/invitations/${invitationToken}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to the organization
        router.push(`/organizations/${result.data.organization_id}`)
      } else {
        console.error('Failed to accept invitation:', result.error)
        // Still redirect to dashboard as fallback
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      router.push('/dashboard')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const validateForm = () => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        throw authError
      }

      if (data.user) {
        // Check if email confirmation is required
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          // Email confirmation required
          setError('Please check your email and click the confirmation link to complete your registration.')
          return
        }

        // Success - user is registered
        if (data.user.id) {
          // Skip profile creation for now - it will be created during organization setup
          console.log('User registered successfully, skipping profile creation');

          // If there's an invitation, accept it
          if (invitationToken) {
            await acceptInvitation(data.user.id)
            return // acceptInvitation handles the redirect
          }
        }

        // Success - redirect to organization setup
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/organization-setup')
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error)

      // Handle specific error types
      if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please try logging in instead.')
      } else if (error.message?.includes('Password should be at least')) {
        setError('Password is too weak. Please choose a stronger password.')
      } else if (error.message?.includes('Unable to validate email address')) {
        setError('Please enter a valid email address.')
      } else if (error.message?.includes('Signup is disabled')) {
        setError('New registrations are currently disabled. Please contact support.')
      } else {
        setError('An unexpected error occurred. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setError('Failed to sign in with Google. Please try again.')
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Apple sign-in error:', error)
      setError('Failed to sign in with Apple. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header - Centered, Minimal */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/focologo.png"
            alt="Foco Logo"
            width={48}
            height={48}
            className="h-12 w-auto"
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">
          {invitationData ? 'Join your team' : 'Create your account'}
        </h1>
        <p className="text-sm text-zinc-600">
          {invitationData
            ? `You've been invited to join ${invitationData.organization_name}`
            : 'Get started with Foco project management'
          }
        </p>
        {invitationData && (
          <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <p className="text-xs text-zinc-700">
              <span className="font-medium">{invitationData.invited_by_name}</span> invited you as{' '}
              <span className="font-medium">{invitationData.role}</span>
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-zinc-700 uppercase tracking-wide"
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="name@company.com"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={isLoading || !!invitationData?.email}
            autoComplete="email"
            data-testid="email-input"
            className="h-10 px-3 text-sm border-zinc-200 bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs font-medium text-zinc-700 uppercase tracking-wide"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="new-password"
            data-testid="password-input"
            className="h-10 px-3 text-sm border-zinc-200 bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 text-xs border border-red-200 bg-red-50 text-red-900 rounded-md">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-10 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
          disabled={isLoading || !formData.email || !formData.password}
          data-testid="register-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-zinc-500">Or continue with</span>
        </div>
      </div>

      {/* Social Buttons - Minimal, no animations */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="h-10 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          <span className="hidden sm:inline">Google</span>
        </button>

        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isLoading}
          className="h-10 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-900 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AppleIcon />
          <span className="hidden sm:inline">Apple</span>
        </button>
      </div>

      {/* Sign in Link */}
      <div className="text-center mt-6">
        <span className="text-sm text-zinc-600">Already have an account? </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            router.push('/login')
          }}
          className="text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}


