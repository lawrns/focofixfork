'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function LoginForm({ onSuccess, redirectTo = '/dashboard/personalized' }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // Check for session timeout or expiry messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const reason = params.get('reason')

      if (reason === 'timeout') {
        setInfo('Tu sesión expiró por inactividad. Por favor, inicia sesión nuevamente.')
      } else if (reason === 'session_expired') {
        setInfo('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        throw authError
      }

      if (data.user) {
        // Check if user has 2FA enabled
        const statusResponse = await fetch('/api/auth/status')
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          if (statusData.twoFactorEnabled) {
            // Store session token and show 2FA form
            setSessionToken(data.session?.access_token || null)
            setNeeds2FA(true)
            return
          }
        }

        // No 2FA - redirect or call onSuccess callback
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectTo)
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)

      // Handle specific error types
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before logging in.')
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes before trying again.')
      } else {
        setError('An unexpected error occurred. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: twoFactorToken,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid 2FA code')
      }

      // Success - redirect or call onSuccess callback
      setNeeds2FA(false)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(redirectTo)
      }
    } catch (error: any) {
      console.error('2FA verification error:', error)
      setError(error.message || 'Invalid 2FA code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Check if submit button should be enabled
  const isFormValid = formData.email && formData.password && isValidEmail(formData.email)

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

  // If 2FA is required, show the 2FA verification form
  if (needs2FA) {
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
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-zinc-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleVerify2FA} className="space-y-4">
          {/* 2FA Code Field */}
          <div className="space-y-2">
            <Label
              htmlFor="twoFactorToken"
              className="text-xs font-medium text-zinc-700 uppercase tracking-wide"
            >
              Authentication Code
            </Label>
            <Input
              id="twoFactorToken"
              name="twoFactorToken"
              type="text"
              placeholder="000000"
              value={twoFactorToken}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setTwoFactorToken(value)
              }}
              maxLength={6}
              disabled={isLoading}
              autoComplete="off"
              data-testid="2fa-token-input"
              className="h-10 px-3 text-sm border-zinc-200 bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors text-center tracking-widest"
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
            disabled={isLoading || twoFactorToken.length !== 6}
            data-testid="verify-2fa-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setNeeds2FA(false)
              setTwoFactorToken('')
              setError(null)
            }}
            className="w-full h-10 text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors"
          >
            Back to Login
          </button>
        </form>
      </div>
    )
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
          Welcome back
        </h1>
        <p className="text-sm text-zinc-600">
          Sign in to your account to continue
        </p>
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
            disabled={isLoading}
            autoComplete="email"
            data-testid="email-input"
            className="h-10 px-3 text-sm border-zinc-200 bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-zinc-700 uppercase tracking-wide"
            >
              Password
            </Label>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                router.push('/forgot-password')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Forgot?
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="current-password"
            data-testid="password-input"
            className="h-10 px-3 text-sm border-zinc-200 bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
          />
        </div>

        {/* Info Message */}
        {info && (
          <div className="px-3 py-2 text-xs border border-blue-200 bg-blue-50 text-blue-900 rounded-md">
            {info}
          </div>
        )}

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
          disabled={isLoading || !isFormValid}
          data-testid="login-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
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

      {/* Sign up Link */}
      <div className="text-center mt-6">
        <span className="text-sm text-zinc-600">Don&apos;t have an account? </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            router.push('/register')
          }}
          className="text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors"
        >
          Sign up
        </button>
      </div>
    </div>
  )
}


