'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  BarChart3, 
  MessageSquare, 
  Calendar,
  Sparkles,
  TrendingUp,
  Users,
  Workflow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Zap,
    title: 'Velocidad sin igual',
    description: 'Interfaz ultrarrápida diseñada para equipos modernos que no pierden el tiempo.'
  },
  {
    icon: Sparkles,
    title: 'IA Integrada',
    description: 'Sugerencias inteligentes y automatización que aprende de tu forma de trabajar.'
  },
  {
    icon: Workflow,
    title: 'Flujos personalizados',
    description: 'Adapta cada proyecto a tu metodología. Kanban, Scrum, o lo que necesites.'
  },
  {
    icon: BarChart3,
    title: 'Analíticas en tiempo real',
    description: 'Datos precisos sobre el progreso de tu equipo, sin esperas ni confusión.'
  },
  {
    icon: MessageSquare,
    title: 'Colaboración fluida',
    description: 'Comentarios, menciones y actualizaciones que mantienen a todos sincronizados.'
  },
  {
    icon: CheckCircle2,
    title: 'Resultados medibles',
    description: 'Seguimiento claro de objetivos y logros que impulsan a tu equipo.'
  }
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
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Workflow className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Foco
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="text-sm font-medium">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Link href="/register">Comenzar gratis</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
                Gestión de proyectos con IA
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-50 dark:via-zinc-200 dark:to-zinc-50 bg-clip-text text-transparent">
              Tu equipo, 
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              enfocado en lo importante
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            La plataforma de gestión de proyectos que elimina el caos.
            <br />
            Rápida, inteligente y diseñada para equipos que construyen productos excepcionales.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              asChild
              className="text-base px-8 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 group"
            >
              <Link href="/register">
                Comenzar gratis
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base px-8 h-12 border-2"
            >
              <Link href="/login">Ver demo</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 text-sm text-zinc-500 dark:text-zinc-500"
          >
            ✨ Sin tarjeta de crédito • Configuración en 2 minutos
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300 bg-clip-text text-transparent">
              Todo lo que necesitas, nada que sobre
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Herramientas poderosas que se sienten naturales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-50">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative p-12 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px]" />
            <div className="relative text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                ¿Listo para trabajar mejor?
              </h2>
              <p className="text-lg text-indigo-100 mb-8">
                Únete a los equipos que ya están construyendo el futuro con Foco
              </p>
              <Button
                size="lg"
                asChild
                className="bg-white text-indigo-600 hover:bg-zinc-50 text-base px-8 h-12 shadow-xl group"
              >
                <Link href="/register">
                  Comenzar gratis
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">Foco</span>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              © 2026 Foco. Construido para equipos que no se conforman.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
