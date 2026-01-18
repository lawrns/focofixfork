'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mic, GitBranch, CheckCircle, MessageSquare, Clock, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// CSS-only fade-in animation to avoid loading framer-motion
const fadeInClass = "animate-in fade-in duration-500";
const fadeInDelayClass = "animate-in fade-in slide-in-from-bottom-4 duration-700";

const metrics = [
  { value: '10x', label: 'Más rápido que hojas de cálculo' },
  { value: '94%', label: 'Menos reuniones de seguimiento' },
  { value: '2 min', label: 'Para crear un proyecto completo' }
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      {/* Navigation - Linear style with transparency */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <Image
                src="/focologo.png"
                alt="Foco"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <span className="text-[15px] font-medium tracking-tight text-zinc-900 dark:text-white">
                Foco
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild size="sm" className="text-[13px] h-9 px-3 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="text-[13px] h-9 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-medium">
                <Link href="/register">Comenzar</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Linear style: bold, direct, minimal */}
      <section className="relative pt-40 pb-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className={`${fadeInClass} mb-7`}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#6366F1] dark:text-[#8B8DFF] bg-[#6366F1]/[0.08] dark:bg-[#8B8DFF]/10 border border-[#6366F1]/20 dark:border-[#8B8DFF]/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Propuestas con IA · Branching para proyectos
            </span>
          </div>

          <h1 className={`${fadeInClass} text-[64px] lg:text-[92px] font-bold tracking-[-0.04em] text-zinc-900 dark:text-white mb-8 leading-[0.95]`}>
            Proyectos que
            <br />
            <span className="bg-gradient-to-br from-[#6366F1] via-[#7C7DFF] to-[#8B8DFF] bg-clip-text text-transparent">avanzan solos</span>
          </h1>

          <p className={`${fadeInClass} text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl leading-relaxed font-light`}>
            Habla tus ideas, la IA las convierte en propuestas estructuradas.
            Revisa, aprueba y merge — como Git, pero para proyectos.
          </p>

          <div className={`${fadeInClass} flex items-center gap-4 mb-20`}>
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-[15px] font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10 transition-all"
            >
              <Link href="/register">
                Comenzar ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-[15px] text-zinc-500 dark:text-zinc-500 font-light">Gratis · Sin tarjeta</span>
          </div>

          {/* Metrics - Social proof */}
          <div className={`${fadeInClass} grid grid-cols-3 gap-12 pt-12 border-t border-zinc-200/80 dark:border-white/[0.08]`}>
            {metrics.map((metric, i) => (
              <div key={i}>
                <div className="text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                  {metric.value}
                </div>
                <div className="text-[15px] text-zinc-500 dark:text-zinc-500 font-light">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: AI Proposals Feature Highlight */}
      <section className="py-24 px-8 bg-gradient-to-b from-[#6366F1]/[0.03] to-transparent dark:from-[#8B8DFF]/[0.03] border-t border-zinc-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-[13px] border-[#6366F1]/30 dark:border-[#8B8DFF]/30 text-[#6366F1] dark:text-[#8B8DFF] bg-[#6366F1]/5 dark:bg-[#8B8DFF]/5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Nuevo: Sistema de Propuestas con IA
            </Badge>
            <h2 className="text-[44px] lg:text-[56px] font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight">
              Ideas → Tareas
              <br />
              <span className="bg-gradient-to-r from-[#6366F1] to-[#8B8DFF] bg-clip-text text-transparent">en segundos</span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
              Habla, escribe o sube archivos. La IA convierte tus ideas en tareas estructuradas
              con asignaciones inteligentes y estimaciones de tiempo.
            </p>
          </div>

          {/* Proposals Flow Illustration */}
          <div className={`${fadeInDelayClass} grid md:grid-cols-3 gap-6 mb-16`}>
            {/* Step 1: Input */}
            <Card className="relative overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-[#6366F1]/30 dark:hover:border-[#8B8DFF]/30 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/15 mb-5 group-hover:scale-105 transition-transform">
                  <Mic className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
                </div>
                <div className="text-xs font-medium text-[#6366F1] dark:text-[#8B8DFF] mb-2">Paso 1</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Describe tu idea</h3>
                <p className="text-[15px] text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                  Habla, escribe o sube documentos. La IA entiende contexto y extrae tareas automáticamente.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 italic">
                    "Necesitamos rediseñar el checkout y migrar a Stripe antes del lanzamiento..."
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: AI Processing */}
            <Card className="relative overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-[#6366F1]/30 dark:hover:border-[#8B8DFF]/30 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/15 mb-5 group-hover:scale-105 transition-transform">
                  <GitBranch className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
                </div>
                <div className="text-xs font-medium text-[#6366F1] dark:text-[#8B8DFF] mb-2">Paso 2</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Propuesta estructurada</h3>
                <p className="text-[15px] text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                  La IA crea una propuesta tipo branch con tareas, asignaciones y timeline comparativo.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[13px] text-emerald-700 dark:text-emerald-400">+3 tareas nuevas</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[13px] text-amber-700 dark:text-amber-400">~12h estimadas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Approval */}
            <Card className="relative overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-[#6366F1]/30 dark:hover:border-[#8B8DFF]/30 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/15 mb-5 group-hover:scale-105 transition-transform">
                  <CheckCircle className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
                </div>
                <div className="text-xs font-medium text-[#6366F1] dark:text-[#8B8DFF] mb-2">Paso 3</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Aprueba y ejecuta</h3>
                <p className="text-[15px] text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                  Revisa, ajusta y aprueba línea por línea. Un click para merge al proyecto real.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Aprobar todo
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Discutir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Benefits */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <Clock className="w-5 h-5 text-[#6366F1] dark:text-[#8B8DFF]" />
              <span className="text-[14px] text-zinc-700 dark:text-zinc-300">Estimaciones automáticas</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <Users className="w-5 h-5 text-[#6366F1] dark:text-[#8B8DFF]" />
              <span className="text-[14px] text-zinc-700 dark:text-zinc-300">Asignación inteligente</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <GitBranch className="w-5 h-5 text-[#6366F1] dark:text-[#8B8DFF]" />
              <span className="text-[14px] text-zinc-700 dark:text-zinc-300">Timeline comparativo</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <Zap className="w-5 h-5 text-[#6366F1] dark:text-[#8B8DFF]" />
              <span className="text-[14px] text-zinc-700 dark:text-zinc-300">Merge instantáneo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Linear linearity: simple list, no grid */}
      <section className="py-24 px-8 bg-zinc-50/50 dark:bg-[#0D0D0D] border-t border-zinc-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[44px] font-bold tracking-tight text-zinc-900 dark:text-white mb-16">
            Hecho para equipos que construyen
          </h2>

          <div className="space-y-16">
            <div className="flex gap-8 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <Mic className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Propuestas con voz
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  Habla tus ideas y la IA las convierte en propuestas estructuradas con tareas,
                  estimaciones y asignaciones automáticas. Como tener un PM que nunca duerme.
                </p>
              </div>
            </div>

            <div className="flex gap-8 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <GitBranch className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Branching para proyectos
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  Como Git pero para gestión de proyectos. Crea propuestas, revisa el impacto
                  lado a lado, aprueba línea por línea y merge cuando estés listo.
                </p>
              </div>
            </div>

            <div className="flex gap-8 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <Zap className="w-6 h-6 text-[#6366F1] dark:text-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Micro-animaciones premium
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  Cada interacción se siente satisfactoria. Spring physics, transiciones fluidas
                  y feedback visual al nivel de Intercom y Miro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Simple and direct */}
      <section className="py-32 px-8 border-t border-zinc-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className={`${fadeInClass} text-[56px] font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight`}>
            Empieza hoy mismo
          </h2>
          <p className={`${fadeInClass} text-xl text-zinc-600 dark:text-zinc-400 mb-12 font-light`}>
            Prueba Foco gratis. Sin tarjeta de crédito, sin trucos.
          </p>
          <div className={fadeInClass}>
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-[15px] font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10 transition-all"
            >
              <Link href="/register">
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-zinc-200/50 dark:border-white/[0.06] py-12 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/focologo.png"
                alt="Foco"
                width={22}
                height={22}
                className="w-5.5 h-5.5 opacity-80"
              />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-white">Foco</span>
            </div>
            <div className="text-[14px] text-zinc-500 dark:text-zinc-500 font-light">
              © 2026 Foco
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
