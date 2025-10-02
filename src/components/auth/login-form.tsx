'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
        // Success - redirect or call onSuccess callback
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

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/focologo.png"
            alt="Foco Logo"
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Bienvenido de vuelta</h1>
        <p className="text-muted-foreground text-base">
          Inicia sesión en tu cuenta de Foco
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="Ingresa tu contraseña"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            autoComplete="current-password"
            data-testid="password-input"
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
          disabled={isLoading || !formData.email || !formData.password}
          data-testid="login-button"
        >
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Iniciar sesión
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
        <span className="text-muted-foreground text-sm">¿No tienes una cuenta? </span>
        <a
          href="/register"
          className="text-primary hover:underline font-medium text-sm"
          onClick={(e) => {
            e.preventDefault()
            router.push('/register')
          }}
        >
          Regístrate
        </a>
      </div>
    </div>
  )
}


