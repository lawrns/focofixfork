'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  Folder,
  Users,
  BarChart3,
  Settings,
  Plus,
  MessageSquare,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
  requiresAuth?: boolean
}

interface MobileBottomNavProps {
  className?: string
  showFab?: boolean
  onFabClick?: () => void
  fabIcon?: React.ComponentType<{ className?: string }>
  fabLabel?: string
}

export function MobileBottomNav({
  className,
  showFab = true,
  onFabClick,
  fabIcon: FabIcon = Plus,
  fabLabel = 'Create'
}: MobileBottomNavProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Hide/show navigation on scroll
  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollThreshold = 10

      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) return

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide nav
        setIsVisible(false)
      } else {
        // Scrolling up or at top - show nav
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile, lastScrollY])

  // Navigation items
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
      requiresAuth: false
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: Folder,
      href: '/dashboard',
      requiresAuth: true
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      href: '/team',
      requiresAuth: true,
      badge: 3 // Example notification count
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      requiresAuth: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      requiresAuth: true
    }
  ]

  // Filter navigation items based on authentication state
  const filteredNavItems = navItems.filter(item => {
    if (loading) return !item.requiresAuth
    return user ? true : !item.requiresAuth
  })

  const handleNavClick = (item: NavItem) => {
    router.push(item.href)
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  if (!isMobile) return null

  return (
    <>
      {/* Bottom Navigation */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border',
              'safe-area-pb', // Account for iPhone home indicator
              className
            )}
          >
            <div className="flex items-center justify-around px-2 py-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      'relative flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200',
                      'min-h-[60px] min-w-[60px]', // Ensure touch targets meet accessibility standards
                      active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5 mb-1" />
                      {item.badge && item.badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </div>
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

      {/* Floating Action Button */}
      {showFab && (
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="fixed bottom-20 right-4 z-50"
            >
              <Button
                onClick={onFabClick}
                size="lg"
                className={cn(
                  'h-14 w-14 rounded-full shadow-lg',
                  'hover:shadow-xl transition-all duration-200',
                  'bg-primary hover:bg-primary/90'
                )}
                aria-label={fabLabel}
              >
                <FabIcon className="w-6 h-6" />
              </Button>

              {/* Optional label */}
              {fabLabel && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                  <div className="bg-foreground text-background px-3 py-1 rounded-md text-sm font-medium shadow-lg">
                    {fabLabel}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

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
