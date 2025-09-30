'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, PlayCircle, Flag, Users, BarChart3, Sparkles, Zap, Target, Check } from 'lucide-react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <div className="min-h-screen bg-white font-[Inter] overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]"
          style={{ y, opacity }}
        />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />

        {/* Floating Shapes */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-[#0066FF]/10 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-24 h-24 bg-[#00D4AA]/10 rounded-full blur-lg"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Navbar - Exclusive */}
      <motion.nav
        className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-50 border-b border-[#E5E5E5]"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Image
                src="/focologo.png"
                alt="Foco Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="ml-3 text-2xl font-bold text-[#0A0A0A]">Foco</span>
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="#features">
                <Button
                  variant="ghost"
                  className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5"
                >
                  Características
                </Button>
              </Link>
              <Link href="#pricing">
                <Button
                  variant="ghost"
                  className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5"
                >
                  Precios
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5"
                >
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </motion.nav>

      {/* Hero Section - Premium Flow Start */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Exclusive Typography */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Refined Headline */}
              <motion.h1
                className="heading-mobile-h1 font-bold mb-6 sm:mb-8 text-[#0A0A0A] mobile-typography"
                style={{ fontFamily: 'Inter Display, Inter, sans-serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              >
                Concéntrate en lo{' '}
                <span className="text-[#0052CC]">importa</span>
              </motion.h1>

              <motion.p
                className="text-mobile-xl text-[#404040] leading-responsive-relaxed mb-8 sm:mb-12 max-w-[35ch] mobile-typography"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Gestión de proyectos con IA que es <span className="font-semibold text-[#0052CC]">gratis para todos</span>—desde ahora.
              </motion.p>

              {/* Exclusive CTA Buttons - Enhanced for mobile */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Link href="/register">
                    <Button className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#004299] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400 min-h-[56px]">
                      Comenzar gratis
                      <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Link href="#demo">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto border-2 border-[#E5E5E5] hover:border-[#6B6B6B] text-[#404040] hover:text-[#0A0A0A] bg-white hover:bg-[#F8F9FA] px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl transition-all duration-400 min-h-[56px]"
                    >
                      Ver Foco →
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column - Glass Video Container - Enhanced for mobile */}
            <motion.div
              className="relative order-first lg:order-last"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            >
              <motion.div
                className="relative backdrop-blur-sm bg-white/90 border border-black/8 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] mx-auto"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ maxWidth: 'calc(100% - 20px)' }} // Reduced margin on mobile
              >
                {/* Video Content - Responsive aspect ratio */}
                <div className="relative bg-[#0A0A0A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {/* Actual Video Element */}
                  <video
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    playsInline
                    poster="/video/introo.mp4" // Add poster for mobile performance
                  >
                    <source src="/video/introo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Optional overlay gradient for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0052CC]/5 via-transparent to-[#00B894]/5 pointer-events-none" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Seamless Flow */}
      <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          {/* Section Divider */}
          <div className="w-full h-px bg-[#E5E5E5] mb-12 sm:mb-20" />

          {/* Feature 1 - Clean Layout */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 sm:mb-40"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Left Side - Monochrome Illustration */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative bg-white rounded-2xl p-12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
                <div className="relative h-80 flex items-center justify-center">
                  <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    {/* Monochrome Timeline with Accent */}
                    <div className="space-y-6">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-[#E5E5E5]" />

                      {/* Timeline Items */}
                      {[
                        { icon: Flag, progress: 85, accent: true },
                        { icon: Target, progress: 60, accent: false },
                        { icon: Zap, progress: 30, accent: false }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          className="relative flex items-center gap-4"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: index * 0.2 }}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 ${item.accent ? 'bg-[#0052CC] border-[#0052CC]' : 'bg-white border-[#E5E5E5]'}`}>
                            <item.icon className={`w-6 h-6 ${item.accent ? 'text-white' : 'text-[#6B6B6B]'}`} />
                          </div>

                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-[#F0F0F0]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-[#0A0A0A]">Hito {index + 1}</span>
                              <span className="text-xs text-[#6B6B6B]">{item.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${item.accent ? 'bg-[#0052CC]' : 'bg-[#E5E5E5]'}`}
                                initial={{ width: "0%" }}
                                whileInView={{ width: `${item.progress}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 2, delay: index * 0.3 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Content */}
            <motion.div
              className="space-y-6 sm:space-y-8"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-[#E5E5E5] min-h-[32px]">
                <Flag className="w-4 h-4 text-[#0052CC] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#0052CC] uppercase tracking-[0.1em]">Seguimiento de hitos</span>
              </div>

              <h2 className="heading-mobile-h2 font-bold text-[#0A0A0A] mobile-typography">
                Cronogramas adaptativos con IA
              </h2>

              <p className="text-mobile-lg text-[#404040] leading-responsive-relaxed max-w-xl mobile-typography">
                Nunca pierdas el ritmo. Nuestra IA analiza tu progreso y ajusta automáticamente los plazos,
                identificando cuellos de botella antes de que se conviertan en problemas críticos.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-[#E5E5E5] min-h-[48px]">
                  <Check className="w-5 h-5 text-[#0052CC] flex-shrink-0" />
                  <span className="text-[#404040] font-medium text-mobile-base mobile-typography">Predicciones automáticas</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-[#E5E5E5] min-h-[48px]">
                  <Check className="w-5 h-5 text-[#0052CC] flex-shrink-0" />
                  <span className="text-[#404040] font-medium text-mobile-base mobile-typography">Alertas inteligentes</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Feature 2 - Reversed */}
          <motion.div
            className="grid lg:grid-cols-2 gap-20 items-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Left Side - Content */}
            <motion.div
              className="space-y-8 lg:order-2"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#E5E5E5]">
                <Users className="w-4 h-4 text-[#00B894]" />
                <span className="text-xs font-semibold text-[#00B894] uppercase tracking-[0.1em]">Colaboración</span>
              </div>

              <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-bold text-[#0A0A0A] leading-[110%] tracking-[-0.01em]">
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
            </motion.div>

            {/* Right Side - Collaboration Illustration */}
            <motion.div
              className="relative lg:order-1"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative bg-white rounded-2xl p-12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
                <div className="relative h-80 flex items-center justify-center">
                  <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    {/* Monochrome Chat Interface */}
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
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof - Light Glassmorphism + Premium Flow */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-[#0A0A0A] mb-6">
              Confiado por equipos en todas partes
            </h2>
            <p className="text-xl text-[#404040] max-w-2xl mx-auto">
              Únete a miles de equipos que ya han transformado su productividad con Foco
            </p>
          </motion.div>

          {/* Monochrome Logo Strip */}
          <div className="flex justify-center items-center gap-16 mb-20 flex-wrap">
            {[
              { name: 'Google', color: '#4285F4' },
              { name: 'Spotify', color: '#1DB954' },
              { name: 'Meta', color: '#1877F2' },
              { name: 'Atlassian', color: '#0052CC' },
              { name: 'Slack', color: '#4A154B' },
              { name: 'Notion', color: '#000000' },
              { name: 'Figma', color: '#F24E1E' },
              { name: 'Adobe', color: '#FF0000' },
            ].map((logo, index) => (
              <motion.div
                key={logo.name}
                className="flex items-center justify-center w-32 h-16 grayscale hover:grayscale-0 transition-all duration-400 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <span className="font-bold text-xl tracking-wide text-[#6B6B6B] hover:text-current transition-colors" style={{ color: 'inherit' }}>
                  {logo.name}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Section Divider */}
          <div className="w-full h-px bg-[#E5E5E5] mb-20" />

          {/* Light Glassmorphism Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Foco nos mantiene alineados sin el ruido. La IA nos ayuda a predecir cuellos de botella antes de que ocurran.",
                author: "Sarah Taylor",
                role: "Gerente de Producto",
                company: "TechFlow",
                avatar: "ST",
                accentColor: "#0052CC",
                delay: 0
              },
              {
                quote: "La asignación inteligente de recursos aumentó nuestra productividad en un 40%. Es como tener un gerente de proyecto IA.",
                author: "Carlos Rodríguez",
                role: "Director de Ingeniería",
                company: "InnovateLab",
                avatar: "CR",
                accentColor: "#00B894",
                delay: 0.2
              },
              {
                quote: "Finalmente tenemos visibilidad completa del progreso de nuestros proyectos. Las actualizaciones en tiempo real son un game changer.",
                author: "Maria González",
                role: "COO",
                company: "GrowthCo",
                avatar: "MG",
                accentColor: "#0052CC",
                delay: 0.4
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: testimonial.delay }}
                whileHover={{ y: -4, boxShadow: '0_8px_32px_rgba(0,0,0,0.08)' }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-6 text-white font-bold text-sm"
                  style={{ backgroundColor: testimonial.accentColor }}
                >
                  {testimonial.avatar}
                </div>

                {/* Quote */}
                <blockquote className="text-[#0A0A0A] mb-8 leading-relaxed text-lg font-medium">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div>
                  <cite className="text-[#0A0A0A] font-semibold block">{testimonial.author}</cite>
                  <p className="text-[#6B6B6B] text-sm">{testimonial.role}</p>
                  <p className="text-[#6B6B6B] text-xs mt-1">{testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Seamless Flow */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-[#F5F5F7]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-[#0A0A0A] mb-6">
              Precios simples y transparentes
            </h2>
            <p className="text-xl text-[#404040] max-w-2xl mx-auto">
              Foco es <span className="font-semibold text-[#0052CC]">gratis para todos</span>—sin límites, sin tarifas ocultas, sin sorpresas.
            </p>
          </motion.div>

          {/* Clean Pricing Card */}
          <motion.div
            className="max-w-lg mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ y: -4 }}
          >
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
              {/* Subtle badge */}
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
                  <motion.div
                    key={feature}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="w-5 h-5 bg-[#0052CC] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[#404040] font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/register">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#004299] text-white py-4 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                    Comenzar gratis ahora
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Clean CTA Bar */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] p-6 z-50"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 1, duration: 0.8, type: "spring", stiffness: 100 }}
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#0A0A0A] text-lg">¿Listo para comenzar?</h3>
                <p className="text-[#6B6B6B]">Únete gratis hoy mismo • Sin tarjeta de crédito</p>
              </div>
              <Link href="/register">
                <Button className="bg-[#0052CC] hover:bg-[#004299] text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
                  Comenzar gratis
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section - Integrated and Premium */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FA]/50 via-[#F0F0F0]/30 to-[#E8E8E8]/20" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              className="text-4xl lg:text-6xl font-bold text-[#0A0A0A] mb-8 leading-tight tracking-[-0.02em]"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              ¿Listo para revolucionar{' '}
              <span className="text-[#0052CC]">tu gestión</span> de proyectos?
            </motion.h2>

            <motion.p
              className="text-xl text-[#404040] mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Únete a miles de equipos que ya han transformado su productividad con Foco.
              Comienza gratis hoy y descubre el poder de la IA aplicada a la gestión de proyectos.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/register">
                  <Button className="bg-[#0052CC] hover:bg-[#004299] text-white px-12 py-5 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                    Comenzar gratis
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="#demo">
                  <Button
                    variant="outline"
                    className="border-2 border-[#6B6B6B] text-[#404040] hover:bg-[#F8F9FA] px-12 py-5 rounded-xl font-semibold text-lg transition-all duration-400"
                  >
                    Ver demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Premium Trust indicators */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-8 text-[#6B6B6B]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Exclusive Dark */}
      <footer className="bg-[#0A0A0A] py-16 px-4 sm:px-6 lg:px-8 border-t border-[#E5E5E5]/10">

        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h4 className="font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#features" className="hover:text-[#0052CC] transition-colors duration-300">Características</a></li>
                <li><a href="#pricing" className="hover:text-[#0052CC] transition-colors duration-300">Precios</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Estado del sistema</a></li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h4 className="font-semibold text-white mb-4">Compañía</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Acerca de</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Blog</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Carreras</a></li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h4 className="font-semibold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Comunidad</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">API Docs</a></li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Privacidad</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Términos</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">Seguridad</a></li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            className="border-t border-white/10 pt-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <p className="text-white/70">© 2025 Foco. <span className="font-semibold text-[#0052CC]">Gratis para todos.</span></p>
            <motion.div
              className="mt-4 flex items-center justify-center gap-6 text-sm text-white/50"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <span>Desarrollado con precisión</span>
              <span>•</span>
              <span>IA integrada</span>
              <span>•</span>
              <span>Open Source</span>
            </motion.div>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}
