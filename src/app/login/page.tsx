import { LoginForm } from '@/components/auth/login-form'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { GitBranch, Mic, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign in — Critter',
  description: 'Sign in to your Critter account.',
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
          <Image src="/focologo.png" alt="Critter" width={28} height={28} className="w-7 h-7 rounded-lg" />
          <span className="text-[16px] font-semibold tracking-tight text-foreground">Critter</span>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-mono-display text-[color:var(--foco-teal)] tracking-widest uppercase mb-4">
              Why Critter
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-snug mb-2">
              From idea to team
              <br />
              in minutes
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Speak your project, AI structures it. Review, approve and merge like Git.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Mic, text: 'Voice proposals — speak, AI converts' },
              { icon: GitBranch, text: 'Project branching — review before executing' },
              { icon: Zap, text: 'Native WhatsApp — operate from anywhere' },
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
            &ldquo;Critter gives us full visibility into every agent run. We dispatch, monitor, and sleep easy.&rdquo;
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
            <Image src="/focologo.png" alt="Critter" width={26} height={26} className="w-6.5 h-6.5 rounded-md" />
            <span className="text-[15px] font-semibold text-foreground">Critter</span>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-[color:var(--foco-teal)] hover:underline underline-offset-2 font-medium"
            >
              Create free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
