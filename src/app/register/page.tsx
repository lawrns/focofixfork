import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/register-form'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { GitBranch, Mic, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Create account — Critter',
  description: 'Create your free Critter account.',
}

function RegisterFormWrapper() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── Left panel — brand ────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-card border-r border-border relative overflow-hidden">

        {/* Grid bg */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Teal glow */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(var(--foco-teal-rgb), 0.07) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 z-10">
          <Image src="/focologo.png" alt="Critter" width={28} height={28} className="w-7 h-7 rounded-lg" />
          <span className="text-[16px] font-semibold tracking-tight text-foreground">Critter</span>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-mono-display text-[color:var(--foco-teal)] tracking-widest uppercase mb-4">
              Empieza gratis
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-snug mb-2">
              Tu equipo merece
              <br />
              una mejor herramienta
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Sin tarjeta de crédito. Sin trucos. Invita a tu equipo en minutos.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Mic,      text: 'Proyectos con voz — habla, la IA estructura' },
              { icon: GitBranch,text: 'Branching inteligente — propone, revisa y aprueba' },
              { icon: Users,    text: 'Multi-workspace — equipos, roles y permisos' },
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

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '10×', label: 'Más rápido' },
            { value: '94%', label: 'Menos reuniones' },
            { value: '2 min', label: 'Setup' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-xl font-bold font-mono-display text-[color:var(--foco-teal)]">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Image src="/focologo.png" alt="Critter" width={26} height={26} className="w-6.5 h-6.5 rounded-md" />
            <span className="text-[15px] font-semibold text-foreground">Critter</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
              Crear cuenta
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Gratis, sin tarjeta de crédito
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-[color:var(--foco-teal)] hover:underline underline-offset-2 font-medium"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse space-y-4 w-full max-w-sm px-6">
            <div className="h-7 bg-secondary rounded w-1/2" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-11 bg-secondary rounded" />)}
            </div>
            <div className="h-11 bg-secondary rounded" />
          </div>
        </div>
      }
    >
      <RegisterFormWrapper />
    </Suspense>
  )
}
