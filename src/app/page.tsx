import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Flag, Users, Check, Download, Smartphone, Sparkles, Zap, Target } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Foco - Gestión de Proyectos con IA",
  description: "Streamline your project management with AI-powered insights, real-time collaboration, and intuitive workflows. Free for everyone.",
  keywords: ["project management", "AI", "collaboration", "productivity", "team management", "gestión de proyectos"],
  openGraph: {
    title: "Foco - Gestión de Proyectos con IA",
    description: "Streamline your project management with AI-powered insights, real-time collaboration, and intuitive workflows.",
    url: "https://foco.mx",
    siteName: "Foco",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foco - Gestión de Proyectos con IA",
    description: "Streamline your project management with AI-powered insights, real-time collaboration, and intuitive workflows.",
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-[Inter] overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]" />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-[#0066FF]/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-[#00D4AA]/10 rounded-full blur-lg animate-pulse" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-50 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center hover:scale-105 transition-transform">
              <Image
                src="/focologo.png"
                alt="Foco Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="ml-3 text-2xl font-bold text-[#0A0A0A]">Foco</span>
            </div>

            <div className="flex items-center space-x-8">
              <Link href="#features">
                <Button variant="ghost" className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  Características
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="ghost" className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  Precios
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50/30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(59,130,246,0.1)_0px,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(at_100%_100%,rgba(168,85,247,0.08)_0px,transparent_50%)]"></div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column */}
            <div className="animate-fade-in">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 sm:mb-8 text-[#0A0A0A] leading-[1.1] tracking-tight">
                Concéntrate en lo{' '}
                <span className="bg-gradient-to-r from-[#0052CC] to-[#667eea] bg-clip-text text-transparent">que importa</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-[#404040] leading-relaxed mb-8 sm:mb-12 max-w-xl">
                Gestión de proyectos con IA que es <span className="font-semibold bg-gradient-to-r from-[#0052CC] to-[#667eea] bg-clip-text text-transparent">gratis para todos</span>—desde ahora.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="w-full sm:w-auto hover:scale-105 transition-transform">
                  <Link href="/register">
                    <Button className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#004299] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400 min-h-[56px]">
                      Comenzar gratis
                      <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                  </Link>
                </div>

                <div className="w-full sm:w-auto hover:scale-105 transition-transform">
                  <Link href="#demo">
                    <Button variant="outline" className="w-full sm:w-auto border-2 border-[#E5E5E5] hover:border-[#6B6B6B] text-[#404040] hover:text-[#0A0A0A] bg-white hover:bg-[#F8F9FA] px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl transition-all duration-400 min-h-[56px]">
                      Ver Foco →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Video */}
            <div className="relative order-first lg:order-last animate-fade-in">
              <div className="relative backdrop-blur-sm bg-white/90 border border-black/8 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] mx-auto hover:-translate-y-1 transition-transform" style={{ maxWidth: 'calc(100% - 20px)' }}>
                <div className="relative bg-[#0A0A0A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video className="w-full h-full object-cover" controls preload="metadata" playsInline poster="/video/introo.mp4">
                    <source src="/video/introo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0052CC]/5 via-transparent to-[#00B894]/5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <div className="w-full h-px bg-[#E5E5E5] mb-12 sm:mb-20" />

          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 sm:mb-40">
            <div className="relative hover:scale-105 transition-transform">
              <div className="relative bg-white rounded-2xl p-12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
                <div className="relative h-80 flex items-center justify-center">
                  <div className="w-full max-w-sm">
                    <div className="space-y-6">
                      <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-[#E5E5E5]" />
                      {[
                        { icon: Flag, progress: 85, accent: true },
                        { icon: Target, progress: 60, accent: false },
                        { icon: Zap, progress: 30, accent: false }
                      ].map((item, index) => (
                        <div key={index} className="relative flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 ${item.accent ? 'bg-[#0052CC] border-[#0052CC]' : 'bg-white border-[#E5E5E5]'}`}>
                            <item.icon className={`w-6 h-6 ${item.accent ? 'text-white' : 'text-[#6B6B6B]'}`} />
                          </div>
                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-[#F0F0F0]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-[#0A0A0A]">Hito {index + 1}</span>
                              <span className="text-xs text-[#6B6B6B]">{item.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${item.accent ? 'bg-[#0052CC]' : 'bg-[#E5E5E5]'}`} style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-[#E5E5E5] min-h-[32px]">
                <Flag className="w-4 h-4 text-[#0052CC] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#0052CC] uppercase tracking-[0.1em]">Seguimiento de hitos</span>
              </div>

              <h2 className="text-4xl font-bold text-[#0A0A0A]">
                Cronogramas adaptativos con IA
              </h2>

              <p className="text-lg text-[#404040] leading-relaxed max-w-xl">
                Nunca pierdas el ritmo. Nuestra IA analiza tu progreso y ajusta automáticamente los plazos,
                identificando cuellos de botella antes de que se conviertan en problemas críticos.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-[#E5E5E5] min-h-[48px]">
                  <Check className="w-5 h-5 text-[#0052CC] flex-shrink-0" />
                  <span className="text-[#404040] font-medium">Predicciones automáticas</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-[#E5E5E5] min-h-[48px]">
                  <Check className="w-5 h-5 text-[#0052CC] flex-shrink-0" />
                  <span className="text-[#404040] font-medium">Alertas inteligentes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#E5E5E5]">
                <Users className="w-4 h-4 text-[#00B894]" />
                <span className="text-xs font-semibold text-[#00B894] uppercase tracking-[0.1em]">Colaboración</span>
              </div>

              <h2 className="text-4xl font-bold text-[#0A0A0A] leading-tight">
                Trabajo en equipo sin fricciones
              </h2>

              <p className="text-lg text-[#404040] leading-relaxed max-w-xl">
                Actualizaciones instantáneas, comentarios en tiempo real y organización perfecta del equipo.
                Nunca pierdas el contexto de tus proyectos colaborativos.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#E5E5E5] rounded-full" />
                  <span className="text-[#404040]">Chat integrado en tiempo real</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#E5E5E5] rounded-full" />
                  <span className="text-[#404040]">Notificaciones inteligentes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00B894] rounded-full" />
                  <span className="text-[#404040]">Roles y permisos avanzados</span>
                </div>
              </div>
            </div>

            <div className="relative lg:order-1 hover:scale-105 transition-transform">
              <div className="relative bg-white rounded-2xl p-12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
                <div className="relative h-80 flex items-center justify-center">
                  <div className="w-full max-w-sm">
                    <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#E5E5E5]">
                          <span className="text-[#0A0A0A] text-xs font-bold">SJ</span>
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-lg p-3 shadow-sm border border-[#F0F0F0]">
                            <p className="text-sm text-[#0A0A0A] font-medium">Hito completado ✅</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 justify-end">
                        <div className="flex-1 max-w-xs">
                          <div className="bg-[#0052CC] rounded-lg p-3 shadow-sm">
                            <p className="text-sm text-white font-medium">¡Excelente trabajo!</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-[#0052CC] rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-xs font-bold">YO</span>
                        </div>
                      </div>

                      <div className="border-t border-[#E5E5E5] pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                          <div className="w-1.5 h-1.5 bg-[#00B894] rounded-full" />
                          <span>María actualizó el proyecto</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                          <div className="w-1.5 h-1.5 bg-[#E5E5E5] rounded-full" />
                          <span>Juan agregó nueva tarea</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-[#F5F5F7]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-[#0A0A0A] mb-6">
              Precios simples y transparentes
            </h2>
            <p className="text-xl text-[#404040] max-w-2xl mx-auto">
              Foco es <span className="font-semibold text-[#0052CC]">gratis para todos</span>—sin límites, sin tarifas ocultas, sin sorpresas.
            </p>
          </div>

          <div className="max-w-lg mx-auto hover:-translate-y-1 transition-transform">
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
              <div className="bg-[#0052CC] text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
                GRATIS PARA SIEMPRE
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#0A0A0A] mb-4">Foco Pro</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-[#0052CC]">$0</span>
                  <span className="text-[#6B6B6B] text-xl">/mes</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Proyectos ilimitados",
                  "Miembros del equipo ilimitados",
                  "IA inteligente integrada",
                  "Colaboración en tiempo real",
                  "Análisis y reportes avanzados",
                  "Soporte prioritario",
                  "Actualizaciones automáticas"
                ].map((feature, index) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-[#0052CC] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[#404040] font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="hover:scale-105 transition-transform">
                <Link href="/register">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#004299] text-white py-4 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                    Comenzar gratis ahora
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FA]/50 via-[#F0F0F0]/30 to-[#E8E8E8]/20" />

        <div className="relative max-w-5xl mx-auto text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-[#0A0A0A] mb-8 leading-tight tracking-tight">
            ¿Listo para revolucionar{' '}
            <span className="text-[#0052CC]">tu gestión</span> de proyectos?
          </h2>

          <p className="text-xl text-[#404040] mb-12 max-w-3xl mx-auto leading-relaxed">
            Únete a miles de equipos que ya han transformado su productividad con Foco.
            Comienza gratis hoy y descubre el poder de la IA aplicada a la gestión de proyectos.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <div className="hover:scale-105 transition-transform">
              <Link href="/register">
                <Button className="bg-[#0052CC] hover:bg-[#004299] text-white px-12 py-5 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                  Comenzar gratis
                </Button>
              </Link>
            </div>

            <div className="hover:scale-105 transition-transform">
              <Link href="#demo">
                <Button variant="outline" className="border-2 border-[#6B6B6B] text-[#404040] hover:bg-[#F8F9FA] px-12 py-5 rounded-xl font-semibold text-lg transition-all duration-400">
                  Ver demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-[#6B6B6B]">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>Sin tarjetas de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>Configuración en 5 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] py-16 px-4 sm:px-6 lg:px-8 border-t border-[#E5E5E5]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/focologo.png"
                  alt="Foco Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
                <span className="ml-3 text-xl font-bold text-white">Foco</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#features" className="hover:text-[#0052CC] transition-colors duration-300">Características</a></li>
                <li><a href="#pricing" className="hover:text-[#0052CC] transition-colors duration-300">Precios</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Estado del sistema</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Compañía</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Acerca de</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Blog</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Carreras</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Comunidad</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">API Docs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Privacidad</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Términos</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Seguridad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/70">© 2025 Foco. <span className="font-semibold text-[#0052CC]">Gratis para todos.</span></p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-white/50">
              <span>Desarrollado con precisión</span>
              <span>•</span>
              <span>IA integrada</span>
              <span>•</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
