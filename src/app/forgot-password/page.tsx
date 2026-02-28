'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(true)
    } catch (error: any) {
      console.error('Password reset error:', error)

      if (error.message?.includes('rate limit')) {
        setError('Demasiadas solicitudes. Por favor, espera unos minutos antes de intentar de nuevo.')
      } else {
        setError('Ocurrió un error al enviar el correo de recuperación. Por favor, inténtalo de nuevo.')
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
            <h1 className="text-2xl font-bold text-foreground">¡Correo enviado!</h1>
            <p className="text-muted-foreground">
              Hemos enviado un enlace de recuperación de contraseña a <strong>{email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, revisa tu correo (incluida la carpeta de spam) y haz clic en el enlace para restablecer tu contraseña.
            </p>
          </div>

          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
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
          <h1 className="text-3xl font-bold text-foreground">Recupera tu contraseña</h1>
          <p className="text-muted-foreground text-base">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
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
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              required
              disabled={isLoading}
              autoComplete="email"
              autoFocus
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
            disabled={isLoading || !email}
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            Enviar enlace de recuperación
          </Button>
        </form>

        <div className="text-center pt-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/login')}
            className="text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
