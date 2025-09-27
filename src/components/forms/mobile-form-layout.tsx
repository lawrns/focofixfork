'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileFormLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  onSubmit?: (data: any) => void
  submitButtonText?: string
  loading?: boolean
  error?: string
}

export function MobileFormLayout({
  children,
  title,
  description,
  className,
  collapsible = false,
  defaultCollapsed = false,
  onSubmit,
  submitButtonText = 'Submit',
  loading = false,
  error
}: MobileFormLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      const formData = new FormData(e.target as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      onSubmit(data)
    }
  }

  if (isMobile) {
    return (
      <div className={cn('w-full max-w-md mx-auto', className)}>
        {/* Mobile Header */}
        {(title || description) && (
          <div className="mb-6 text-center">
            {title && (
              <h2 className="text-xl font-bold text-foreground mb-2">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Collapsible Form Container */}
        <motion.div
          className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
          initial={false}
        >
          {/* Collapsible Header */}
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between text-left hover:bg-muted/70 transition-colors"
              aria-expanded={!isCollapsed}
            >
              <span className="text-sm font-medium text-foreground">
                {title || 'Form Details'}
              </span>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Form Content */}
          <motion.div
            initial={false}
            animate={{
              height: isCollapsed && collapsible ? 0 : 'auto',
              opacity: isCollapsed && collapsible ? 0 : 1
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
              {children}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                </motion.div>
              )}

              {/* Submit Button */}
              {onSubmit && (
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : submitButtonText}
                  </Button>
                </div>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Desktop Layout (fallback to standard form)
  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Desktop Header */}
      {(title || description) && (
        <div className="mb-8 text-center">
          {title && (
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Form Container */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {children}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
            >
              <p className="text-destructive font-medium">
                {error}
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          {onSubmit && (
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full sm:w-auto px-8 py-3"
                disabled={loading}
              >
                {loading ? 'Submitting...' : submitButtonText}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default MobileFormLayout

