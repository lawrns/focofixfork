'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#6366F1] dark:text-[#8B8DFF] bg-[#6366F1]/[0.08] dark:bg-[#8B8DFF]/10 border border-[#6366F1]/20 dark:border-[#8B8DFF]/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] dark:bg-[#8B8DFF] animate-pulse" />
              Gestión moderna de proyectos
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-[64px] lg:text-[92px] font-bold tracking-[-0.04em] text-zinc-900 dark:text-white mb-8 leading-[0.95]"
          >
            Proyectos que
            <br />
            <span className="bg-gradient-to-br from-[#6366F1] via-[#7C7DFF] to-[#8B8DFF] bg-clip-text text-transparent">avanzan solos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl leading-relaxed font-light"
          >
            La herramienta que elimina fricción. Tu equipo planifica, ejecuta y entrega
            sin perder tiempo en procesos que no importan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4 mb-20"
          >
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
          </motion.div>

          {/* Metrics - Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-3 gap-12 pt-12 border-t border-zinc-200/80 dark:border-white/[0.08]"
          >
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
          </motion.div>
        </div>
      </section>

      {/* Features - Linear linearity: simple list, no grid */}
      <section className="py-24 px-8 bg-zinc-50/50 dark:bg-[#0D0D0D] border-t border-zinc-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[44px] font-bold tracking-tight text-zinc-900 dark:text-white mb-16">
            Hecho para equipos que construyen
          </h2>

          <div className="space-y-16">
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex gap-8 group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#6366F1] dark:bg-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Issues que se resuelven rápido
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  Crea, asigna y cierra tareas en segundos. Sin formularios complejos ni pasos innecesarios.
                  Todo lo que necesitas, nada más.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex gap-8 group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#6366F1] dark:bg-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Proyectos con claridad total
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  Roadmaps, sprints y entregas visibles para todo el equipo. Saben qué hacer y por qué importa.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-8 group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6366F1]/10 dark:bg-[#8B8DFF]/10 flex items-center justify-center group-hover:bg-[#6366F1]/20 dark:group-hover:bg-[#8B8DFF]/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#6366F1] dark:bg-[#8B8DFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-3">
                  Integraciones que funcionan
                </h3>
                <p className="text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-light max-w-2xl">
                  GitHub, Slack, Figma. Tu stack actual funciona mejor con Foco en el centro.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA - Simple and direct */}
      <section className="py-32 px-8 border-t border-zinc-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[56px] font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight"
          >
            Empieza hoy mismo
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-xl text-zinc-600 dark:text-zinc-400 mb-12 font-light"
          >
            Prueba Foco gratis. Sin tarjeta de crédito, sin trucos.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
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
          </motion.div>
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
