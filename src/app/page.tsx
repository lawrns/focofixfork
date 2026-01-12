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
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation - Simple, Linear style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Image
                src="/focologo.png"
                alt="Foco"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Foco
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm" className="text-sm">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200">
                <Link href="/register">Comenzar</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Linear style: bold, direct, minimal */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <span className="inline-block px-3 py-1 text-xs font-medium text-[#6366F1] bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-full">
              Gestión moderna de proyectos
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-6xl lg:text-8xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-[1.1]"
          >
            Proyectos que
            <br />
            <span className="text-[#6366F1]">avanzan solos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl leading-relaxed"
          >
            La herramienta que elimina fricción. Tu equipo planifica, ejecuta y entrega
            sin perder tiempo en procesos que no importan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center gap-3 mb-16"
          >
            <Button
              asChild
              size="lg"
              className="h-11 px-6 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900"
            >
              <Link href="/register">
                Comenzar ahora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-zinc-500">Gratis • Sin tarjeta</span>
          </motion.div>

          {/* Metrics - Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 pt-8 border-t border-zinc-200 dark:border-zinc-800"
          >
            {metrics.map((metric, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-zinc-500">
                  {metric.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features - Linear linearity: simple list, no grid */}
      <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-12">
            Hecho para equipos que construyen
          </h2>

          <div className="space-y-12">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#6366F1]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Issues que se resuelven rápido
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Crea, asigna y cierra tareas en segundos. Sin formularios complejos ni pasos innecesarios.
                  Todo lo que necesitas, nada más.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#6366F1]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Proyectos con claridad total
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Roadmaps, sprints y entregas visibles para todo el equipo. Saben qué hacer y por qué importa.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#6366F1]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Integraciones que funcionan
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  GitHub, Slack, Figma. Tu stack actual funciona mejor con Foco en el centro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Simple and direct */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Empieza hoy mismo
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10">
            Prueba Foco gratis. Sin tarjeta de crédito, sin trucos.
          </p>
          <Button
            asChild
            size="lg"
            className="h-11 px-6 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900"
          >
            <Link href="/register">
              Crear cuenta gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/focologo.png"
                alt="Foco"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Foco</span>
            </div>
            <div className="text-sm text-zinc-500">
              © 2026 Foco
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
