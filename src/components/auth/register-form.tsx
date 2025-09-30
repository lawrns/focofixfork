'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
    confirmPassword: '',
    displayName: '',
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

        // Success - create user profile
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

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-foreground">
          {invitationData ? 'Únete a tu equipo' : 'Crear tu cuenta'}
        </h1>
        <p className="text-muted-foreground text-base">
          {invitationData
            ? `Has sido invitado a unirte a ${invitationData.organization_name} en Foco`
            : 'Comienza con la gestión de proyectos de Foco'
          }
        </p>
        {invitationData && (
          <div className="bg-muted p-4 rounded-lg mt-4">
            <p className="text-sm">
              <strong>{invitationData.invited_by_name}</strong> te ha invitado como <strong>{invitationData.role}</strong> en <strong>{invitationData.organization_name}</strong>.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
            Nombre de usuario
          </Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Ingresa tu nombre de usuario"
            value={formData.displayName}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="name"
            data-testid="displayName-input"
            className="h-12 px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Ingresa tu correo electrónico"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="email"
            data-testid="email-input"
            className="h-12 px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Crea una contraseña (mín. 8 caracteres)"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="new-password"
            data-testid="password-input"
            className="h-12 px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirmar contraseña
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirma tu contraseña"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="new-password"
            data-testid="confirmPassword-input"
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
          disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword || !formData.displayName}
          data-testid="register-button"
        >
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Crear cuenta
        </Button>
      </form>

      {/* Social Login Buttons */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            className="h-12 text-base font-medium bg-[#4285F4] hover:bg-[#3367D6] text-white border-0 shadow-sm hover:shadow-md rounded-lg transition-all duration-200"
            onClick={() => console.log('Google sign-in clicked')}
          >
            <GoogleIcon />
            <span className="ml-2">Inicia sesión con Google</span>
          </Button>

          <Button
            type="button"
            className="h-12 text-base font-medium bg-black hover:bg-gray-800 text-white border-0 shadow-sm hover:shadow-md rounded-lg transition-all duration-200"
            onClick={() => console.log('Apple sign-in clicked')}
          >
            <AppleIcon />
            <span className="ml-2">Inicia sesión con Apple</span>
          </Button>
        </div>
      </div>

      <div className="text-center pt-2">
        <span className="text-muted-foreground text-sm">¿Ya tienes una cuenta? </span>
        <a
          href="/login"
          className="text-primary hover:underline font-medium text-sm"
          onClick={(e) => {
            e.preventDefault()
            router.push('/login')
          }}
        >
          Inicia sesión
        </a>
      </div>
    </div>
  )
}


