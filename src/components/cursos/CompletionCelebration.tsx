'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CompletionCelebrationProps {
  courseName: string
  userName?: string
  onComplete?: () => void
  isVisible?: boolean
}

/**
 * CompletionCelebration - Displays celebration animation when user completes 100% of course
 *
 * Features:
 * - Confetti burst with particles
 * - Trophy animation with spring physics
 * - Star rating display
 * - Certificate preview
 * - Social share buttons
 */
export function CompletionCelebration({
  courseName,
  userName = 'Vibe Coder',
  onComplete,
  isVisible = true
}: CompletionCelebrationProps) {
  const [hasMounted, setHasMounted] = useState(false)

  // Pre-generate particles on initial render to prevent hydration mismatch
  const [particles] = useState(() => {
    const colors = [
      'bg-emerald-400',
      'bg-green-500',
      'bg-teal-400',
      'bg-cyan-400',
      'bg-lime-400',
      'bg-yellow-400',
      'bg-amber-400'
    ]

    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 500
    }))
  })

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (isVisible && hasMounted) {
      // Call completion callback after animation
      const timer = setTimeout(() => {
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, hasMounted, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onComplete?.()}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 200
            }}
            className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl p-12 max-w-2xl w-full mx-4 shadow-2xl border-4 border-yellow-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{
                    scale: [0, 1.5, 1, 0],
                    x: particle.x,
                    y: particle.y,
                    opacity: [1, 1, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    delay: particle.delay / 1000,
                    ease: 'easeOut'
                  }}
                  className={`absolute w-3 h-3 rounded-full ${particle.color}`}
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                />
              ))}
            </div>

            {/* Trophy Icon */}
            <motion.div
              initial={{ y: -50, opacity: 0, rotate: -180 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{
                delay: 0.3,
                type: 'spring',
                damping: 10,
                stiffness: 100
              }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <Trophy className="w-24 h-24 text-yellow-500 drop-shadow-2xl" />
                {/* Glow effect */}
                <div className="absolute inset-0 blur-xl bg-yellow-400/30 rounded-full" />
              </div>
            </motion.div>

            {/* Stars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center gap-2 mb-6"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                  key={star}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.7 + (star * 0.1),
                    type: 'spring',
                    damping: 8,
                    stiffness: 150
                  }}
                >
                  <Star className="w-8 h-8 text-yellow-400 fill-current" />
                </motion.div>
              ))}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
            >
              ¡Felicidades, {userName}!
            </motion.h2>

            {/* Course Name */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xl text-center text-zinc-600 dark:text-zinc-300 mb-6"
            >
              Has completado <strong>{courseName}</strong>
            </motion.p>

            {/* Achievement Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 1.2,
                type: 'spring',
                damping: 12,
                stiffness: 100
              }}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-8 py-4 rounded-full text-center mb-8 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <span className="text-xl font-bold">Fyves Vibe Coder - Nivel 1</span>
                <Sparkles className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">9</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Módulos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">100%</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Completado</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">4h</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Duración</div>
              </div>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="text-center text-zinc-600 dark:text-zinc-400 space-y-2"
            >
              <p className="font-semibold">Próximos pasos:</p>
              <ul className="text-sm space-y-1">
                <li>• Tu certificado está disponible en tu perfil</li>
                <li>• Acceso a repositorios sensibles habilitado</li>
                <li>• Comparte tu logro con el equipo</li>
              </ul>
            </motion.div>

            {/* Continue Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="flex justify-center mt-8"
            >
              <button
                onClick={() => onComplete?.()}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
