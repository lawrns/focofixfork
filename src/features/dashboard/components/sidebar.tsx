'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
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

      {/* Sidebar - Clean Linear-inspired design */}
      <motion.aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 flex flex-col',
          'bg-zinc-50/50 dark:bg-zinc-900',
          'border-r border-zinc-100 dark:border-zinc-800',
          'lg:relative lg:translate-x-0',
          'sm:w-72'
        )}
        variants={sidebarVariants}
        initial="closed"
        animate={sidebarOpen ? 'open' : 'closed'}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Image
              src="/focologo.png"
              alt="Foco Logo"
              width={32}
              height={32}
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Foco</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Project Management</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-8 w-8 p-0 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150',
                  'min-h-[44px]',
                  item.active
                    ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors duration-150',
                  item.active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-500'
                )} />
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </div>

          {/* Projects Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Projects</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateProject}
                className="h-7 w-7 p-0 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
                aria-label="Create new project"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect?.(project)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
                    'min-h-[40px]',
                    selectedProject?.id === project.id
                      ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                  )}
                  aria-label={`Select project ${project.name}`}
                >
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusColor(project.status))} />
                  <span className="truncate flex-1">{project.name}</span>
                </button>
              ))}

              {projects.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-3">No projects yet</p>
                  <Button
                    size="sm"
                    onClick={onCreateProject}
                    className="w-full h-10 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-150"
                  >
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4">
          <div className="space-y-0.5">
            <a
              href="/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 min-h-[44px]"
            >
              <Settings className="h-5 w-5 flex-shrink-0 text-zinc-500" />
              <span>Settings</span>
            </a>
            <a
              href="/help"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 min-h-[44px]"
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0 text-zinc-500" />
              <span>Help & Docs</span>
            </a>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

export default DashboardSidebar


