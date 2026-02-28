'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.')
      }
    }

    checkSession()
  }, [])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres'
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra mayúscula'
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra minúscula'
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un número'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: any) {
      console.error('Password update error:', error)

      if (error.message?.includes('same as the old password')) {
        setError('La nueva contraseña debe ser diferente de la anterior')
      } else {
        setError('Ocurrió un error al actualizar tu contraseña. Por favor, inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">¡Contraseña actualizada!</h1>
            <p className="text-muted-foreground">
              Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>

          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="space-y-3 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/focologo.png"
              alt="Critter Logo"
              width={64}
              height={64}
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Restablece tu contraseña</h1>
          <p className="text-muted-foreground text-base">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu nueva contraseña"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  if (error) setError(null)
                }}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="h-12 px-4 pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres, con mayúsculas, minúsculas y números
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirma tu nueva contraseña"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value })
                  if (error) setError(null)
                }}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="h-12 px-4 pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={isLoading || !formData.password || !formData.confirmPassword}
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            Actualizar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
