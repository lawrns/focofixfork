'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface InstallPromptProps {
  className?: string
  autoShow?: boolean
  showDelay?: number
  t?: (key: string, defaultValue?: string) => string // Translation function
}

export function InstallPrompt({
  className,
  autoShow = true,
  showDelay = 30000 // 30 seconds
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // Detect mobile and PWA status
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Check if already installed
    const checkInstalled = () => {
      if ('standalone' in window.navigator && (window.navigator as any).standalone) {
        setIsInstalled(true)
        return
      }

      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }

      // Check for iOS PWA
      if ('standalone' in (window.navigator as any) && (window.navigator as any).standalone) {
        setIsInstalled(true)
        return
      }
    }

    checkInstalled()

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      if (autoShow && !isInstalled) {
        const timer = setTimeout(() => {
          setIsVisible(true)
        }, showDelay)

        return () => clearTimeout(timer)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [autoShow, showDelay, isInstalled])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setIsInstalled(true)
      } else {
        console.log('User dismissed the install prompt')
      }

      setDeferredPrompt(null)
      setIsVisible(false)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Remember user dismissed for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if not mobile, already installed, no prompt available, or user dismissed
  if (!isMobile || isInstalled || !deferredPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Install Prompt */}
          <motion.div
            className={cn(
              'fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-2xl p-6',
              'safe-area-pb', // Account for iPhone home indicator
              className
            )}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Install Foco on your device
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Instant access, works offline, and real-time notifications. No App Store needed.
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="p-2 h-8 w-8 flex-shrink-0"
                    aria-label="Dismiss install prompt"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    <span>Acceso sin conexión</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <span>Notificaciones</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                    <span>Inicio rápido</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    <span>Como app nativa</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleInstall}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    className="flex-1"
                    size="sm"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Hook for manual install prompt triggering
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return outcome === 'accepted'
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    promptInstall
  }
}

export default InstallPrompt
