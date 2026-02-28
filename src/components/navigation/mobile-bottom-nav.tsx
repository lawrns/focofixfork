'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  Send,
  Activity,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import { hapticService } from '@/lib/audio/haptic-service'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

interface MobileBottomNavProps {
  className?: string
  showFab?: boolean
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home,     href: '/dashboard' },
  { id: 'dispatch',  label: 'Dispatch',  icon: Send,     href: '/openclaw' },
  { id: 'runs',      label: 'Runs',      icon: Activity, href: '/runs' },
  { id: 'settings',  label: 'Settings',  icon: Settings, href: '/settings' },
]

export function MobileBottomNav({
  className,
  showFab = false,
}: MobileBottomNavProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollThreshold = 10

      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) return

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile, lastScrollY])

  const handleNavClick = (item: NavItem) => {
    hapticService.light()
    router.push(item.href)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href)
  }

  if (!isMobile) return null

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border',
              'safe-area-pb',
              className
            )}
          >
            <div className="flex items-center justify-around px-2 py-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      'relative flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200',
                      'min-h-[60px] min-w-[60px]',
                      active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium leading-none">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Bottom safe area padding when nav is hidden */}
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '80px' }}
            exit={{ height: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileBottomNav
