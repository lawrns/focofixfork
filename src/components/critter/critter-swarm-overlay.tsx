'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CritterSwarmOverlayProps {
  swarmId: string
  sourceRect: DOMRect | null
  targetRect: DOMRect | null
  label: string
  onComplete: () => void
}

interface Particle {
  id: number
  // initial burst offset from source center
  burstX: number
  burstY: number
  // random stagger delay 0–150ms
  delay: number
  // random burst angle
  angle: number
  burstDist: number
}

function getParticleCount(): number {
  const base = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.min(16, navigator.hardwareConcurrency * 2)
    : 12
  return Math.max(8, Math.min(base, 16))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function rectCenter(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

// Single particle component
interface CritterParticleProps {
  particle: Particle
  sourceCenter: { x: number; y: number }
  targetCenter: { x: number; y: number }
  onDone: () => void
}

function CritterParticle({ particle, sourceCenter, targetCenter, onDone }: CritterParticleProps) {
  // Phase positions:
  // 0: at source center
  // 1 (burst): ejected outward
  // 2 (flock → dock): converge to target center, scale to 0

  const burstX = sourceCenter.x + Math.cos(particle.angle) * particle.burstDist
  const burstY = sourceCenter.y + Math.sin(particle.angle) * particle.burstDist

  const DIAMOND =
    'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'

  const tealColor = 'hsl(168, 80%, 50%)'

  return (
    <>
      {/* Motion trail ghost 1 — farthest, most transparent */}
      <motion.div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 6,
          height: 6,
          clipPath: DIAMOND,
          backgroundColor: tealColor,
          pointerEvents: 'none',
          x: sourceCenter.x - 3,
          y: sourceCenter.y - 3,
          originX: '50%',
          originY: '50%',
        }}
        animate={{
          x: [sourceCenter.x - 3, burstX - 3, targetCenter.x - 3],
          y: [sourceCenter.y - 3, burstY - 3, targetCenter.y - 3],
          opacity: [0, 0.1, 0],
          scale: [0.5, 0.7, 0],
        }}
        transition={{
          delay: particle.delay / 1000 + 0.06,
          duration: 1.0,
          times: [0, 0.3, 1],
          ease: ['easeOut', [0.34, 1.56, 0.64, 1]],
        }}
      />
      {/* Motion trail ghost 2 — closer, slightly more visible */}
      <motion.div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 6,
          height: 6,
          clipPath: DIAMOND,
          backgroundColor: tealColor,
          pointerEvents: 'none',
          x: sourceCenter.x - 3,
          y: sourceCenter.y - 3,
          originX: '50%',
          originY: '50%',
        }}
        animate={{
          x: [sourceCenter.x - 3, burstX - 3, targetCenter.x - 3],
          y: [sourceCenter.y - 3, burstY - 3, targetCenter.y - 3],
          opacity: [0, 0.3, 0],
          scale: [0.6, 0.8, 0],
        }}
        transition={{
          delay: particle.delay / 1000 + 0.03,
          duration: 1.0,
          times: [0, 0.3, 1],
          ease: ['easeOut', [0.34, 1.56, 0.64, 1]],
        }}
      />
      {/* Lead particle */}
      <motion.div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 6,
          height: 6,
          clipPath: DIAMOND,
          backgroundColor: tealColor,
          pointerEvents: 'none',
          x: sourceCenter.x - 3,
          y: sourceCenter.y - 3,
          originX: '50%',
          originY: '50%',
        }}
        animate={{
          x: [sourceCenter.x - 3, burstX - 3, targetCenter.x - 3],
          y: [sourceCenter.y - 3, burstY - 3, targetCenter.y - 3],
          opacity: [0, 1, 0],
          scale: [0.8, 1, 0],
        }}
        transition={{
          delay: particle.delay / 1000,
          duration: 1.0,
          times: [0, 0.3, 1],
          ease: ['easeOut', [0.34, 1.56, 0.64, 1]],
        }}
        onAnimationComplete={onDone}
      />
    </>
  )
}

export function CritterSwarmOverlay({
  swarmId,
  sourceRect,
  targetRect,
  label: _label,
  onComplete,
}: CritterSwarmOverlayProps) {
  const [particles] = useState<Particle[]>(() => {
    const count = getParticleCount()
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      burstX: 0,
      burstY: 0,
      delay: Math.random() * 150,
      angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      burstDist: 40 + Math.random() * 60,
    }))
  })

  const [doneCount, setDoneCount] = useState(0)
  const [showGlow, setShowGlow] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const handleParticleDone = useCallback(() => {
    setDoneCount(prev => prev + 1)
  }, [])

  // Reduced motion path
  useEffect(() => {
    if (!prefersReducedMotion()) return

    // Flash the target element if it has data-swarm-target
    const targetEl = document.querySelector('[data-swarm-target="true"]') as HTMLElement | null
    if (targetEl) {
      const prev = targetEl.style.boxShadow
      const prevTransition = targetEl.style.transition
      targetEl.style.transition = 'box-shadow 0.1s ease-in, box-shadow 0.3s ease-out'
      targetEl.style.boxShadow = '0 0 0 2px var(--foco-teal), 0 0 12px var(--foco-teal)'
      const t1 = setTimeout(() => {
        targetEl.style.boxShadow = prev
        targetEl.style.transition = prevTransition
      }, 300)
      const t2 = setTimeout(() => {
        onCompleteRef.current()
      }, 400)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else {
      const t = setTimeout(() => onCompleteRef.current(), 400)
      return () => clearTimeout(t)
    }
  }, [])

  // Trigger glow when all particles land (or after 1.2s safety timeout)
  useEffect(() => {
    if (prefersReducedMotion()) return
    if (doneCount >= particles.length) {
      setShowGlow(true)
    }
  }, [doneCount, particles.length])

  useEffect(() => {
    if (!showGlow) return
    const t = setTimeout(() => {
      onCompleteRef.current()
    }, 350)
    return () => clearTimeout(t)
  }, [showGlow])

  // Safety net: call onComplete after 1.5s regardless
  useEffect(() => {
    const t = setTimeout(() => {
      onCompleteRef.current()
    }, 1600)
    return () => clearTimeout(t)
  }, [])

  if (!sourceRect || !targetRect) return null
  if (prefersReducedMotion()) return null

  const sourceCenter = rectCenter(sourceRect)
  const targetCenter = rectCenter(targetRect)

  return (
    <div
      key={swarmId}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {particles.map(p => (
        <CritterParticle
          key={p.id}
          particle={p}
          sourceCenter={sourceCenter}
          targetCenter={targetCenter}
          onDone={handleParticleDone}
        />
      ))}

      {/* Dock glow ring at target */}
      <AnimatePresence>
        {showGlow && (
          <motion.div
            style={{
              position: 'fixed',
              left: targetCenter.x - 20,
              top: targetCenter.y - 10,
              width: 40,
              height: 20,
              borderRadius: 4,
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0, boxShadow: '0 0 0 0px hsl(168,80%,50%), 0 0 0px hsl(168,80%,50%)' }}
            animate={{ opacity: 1, boxShadow: '0 0 0 2px hsl(168,80%,50%), 0 0 12px hsl(168,80%,50%)', transition: { duration: 0.15 } }}
            exit={{ opacity: 0, boxShadow: '0 0 0 0px hsl(168,80%,50%), 0 0 0px hsl(168,80%,50%)', transition: { duration: 0.3 } }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
