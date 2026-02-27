import { LoginForm } from '@/components/auth/login-form'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { GitBranch, Mic, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Iniciar sesión — Foco',
  description: 'Inicia sesión en tu cuenta de Foco.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── Left panel — brand narrative ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-card border-r border-border relative overflow-hidden">

        {/* Subtle grid bg */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Teal glow orb */}
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(var(--foco-teal-rgb), 0.08) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 z-10">
          <Image src="/focologo.png" alt="Foco" width={28} height={28} className="w-7 h-7 rounded-lg" />
          <span className="text-[16px] font-semibold tracking-tight text-foreground">Foco</span>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-mono-display text-[color:var(--foco-teal)] tracking-widest uppercase mb-4">
              Por qué Foco
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-snug mb-2">
              De la idea al equipo
              <br />
              en minutos
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Habla tu proyecto, la IA lo estructura. Revisa, aprueba y merge como en Git.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Mic, text: 'Propuestas con voz — habla, la IA convierte' },
              { icon: GitBranch, text: 'Branching de proyectos — revisa antes de ejecutar' },
              { icon: Zap, text: 'WhatsApp nativo — opera desde donde estés' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[color:var(--foco-teal-dim)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[color:var(--foco-teal)]" />
                </div>
                <span className="text-[13px] text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10">
          <p className="text-[13px] text-muted-foreground italic leading-relaxed mb-3">
            &ldquo;Foco redujo nuestras reuniones semanales de seguimiento en un 80%. Ahora hablamos los proyectos y el equipo los ejecuta.&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[color:var(--foco-teal)]">OA</span>
            </div>
            <span className="text-[12px] text-muted-foreground">Oscar A. · Fyves</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Image src="/focologo.png" alt="Foco" width={26} height={26} className="w-6.5 h-6.5 rounded-md" />
            <span className="text-[15px] font-semibold text-foreground">Foco</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
              Bienvenido de vuelta
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="text-[color:var(--foco-teal)] hover:underline underline-offset-2 font-medium"
            >
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
