'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function RegisterForm({ onSuccess, redirectTo = '/dashboard' }: RegisterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })

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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required')
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
        options: {
          data: {
            display_name: formData.displayName.trim(),
          }
        }
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

        // Success - create user profile and redirect
        if (data.user.id) {
          // Create user profile in our database
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              display_name: formData.displayName.trim(),
              email_notifications: true,
              theme_preference: 'system',
            })

          if (profileError) {
            console.error('Profile creation error:', profileError)
            // Don't fail registration if profile creation fails, just log it
          }
        }

        // Success - redirect or call onSuccess callback
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectTo)
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

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground">
          Get started with Foco project management
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Enter your display name"
            value={formData.displayName}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password (min. 8 characters)"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword || !formData.displayName}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <a
          href="/login"
          className="text-primary hover:underline"
          onClick={(e) => {
            e.preventDefault()
            router.push('/login')
          }}
        >
          Sign in
        </a>
      </div>
    </div>
  )
}


