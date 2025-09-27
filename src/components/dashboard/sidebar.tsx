'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Folder,
  Plus,
  Users,
  HelpCircle,
  Settings,
  ChevronLeft,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  status: string
}

interface DashboardSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  selectedProject?: Project
  projects?: Project[]
  onProjectSelect?: (project: Project) => void
  onCreateProject?: () => void
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  selectedProject,
  projects = [],
  onProjectSelect,
  onCreateProject
}) => {
  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/', active: true },
    { icon: Folder, label: 'Projects', href: '/projects' },
    { icon: Users, label: 'Team', href: '/team' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'planning':
        return 'bg-blue-500'
      case 'on-hold':
        return 'bg-amber-500'
      case 'completed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <>
      {/* Mobile Overlay - Enhanced for touch */}
      {sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Sidebar - Enhanced touch targets */}
      <motion.aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col',
          'lg:relative lg:translate-x-0',
          // Mobile-specific enhancements
          'sm:w-72' // Slightly wider on larger mobile devices
        )}
        variants={sidebarVariants}
        initial="closed"
        animate={sidebarOpen ? 'open' : 'closed'}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-foreground">Foco</h1>
              <p className="text-xs font-medium text-muted-foreground">Project Management</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation - Enhanced touch targets */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  'min-h-[48px] flex items-center', // 48px minimum touch target
                  'sm:py-2', // Smaller padding on larger screens
                  item.active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </div>

          {/* Projects Section - Enhanced touch targets */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Projects</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateProject}
                className="h-8 w-8 p-0 rounded-lg" // Larger touch target
                aria-label="Create new project"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect?.(project)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors',
                    'min-h-[48px] flex items-center', // 48px minimum touch target
                    selectedProject?.id === project.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                  )}
                  aria-label={`Select project ${project.name}`}
                >
                  <div className={cn('w-3 h-3 rounded-full flex-shrink-0', getStatusColor(project.status))} />
                  <span className="truncate flex-1">{project.name}</span>
                </button>
              ))}

              {projects.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No projects yet</p>
                  <Button
                    size="sm"
                    onClick={onCreateProject}
                    className="w-full h-12 rounded-lg" // Larger touch target
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Footer - Enhanced touch targets */}
        <div className="border-t border-border p-4">
          <div className="space-y-2">
            <a
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[48px] flex items-center"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span>Settings</span>
            </a>
            <a
              href="/help"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[48px] flex items-center"
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0" />
              <span>Help & Docs</span>
            </a>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

export default DashboardSidebar


