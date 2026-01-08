'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardSidebar from './sidebar'
import DashboardHeader from './header'
import { SkipLink } from '@/components/ui/accessible-form'
import { ViewConfig } from '@/lib/hooks/use-saved-views'

interface DashboardLayoutProps {
  children: React.ReactNode
  selectedProject?: any
  projects?: any[]
  onProjectSelect?: (project: any) => void
  onCreateProject?: () => void
  activeView?: 'table' | 'kanban' | 'gantt'
  onViewChange?: (view: 'table' | 'kanban' | 'gantt') => void
  searchTerm?: string
  onSearchChange?: (term: string) => void
  isConnected?: boolean
  onViewSelect?: (view: ViewConfig) => void
  onViewSave?: (name: string) => void
  currentViewConfig?: Omit<ViewConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  selectedProject,
  projects = [],
  onProjectSelect,
  onCreateProject,
  activeView = 'table',
  onViewChange,
  searchTerm = '',
  onSearchChange,
  isConnected = true,
  onViewSelect,
  onViewSave,
  currentViewConfig
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Skip Links for Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#search">Skip to search</SkipLink>

      <div
        className="min-h-screen bg-background flex"
        role="application"
        aria-label="Foco Dashboard"
      >
        {/* Sidebar Navigation */}
        <nav
          id="navigation"
          aria-label="Main navigation"
          role="navigation"
        >
          <DashboardSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            selectedProject={selectedProject}
            projects={projects}
            onProjectSelect={onProjectSelect}
            onCreateProject={onCreateProject}
          />
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header role="banner" aria-label="Dashboard header">
            <DashboardHeader
              selectedProject={selectedProject}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              activeView={activeView}
              setActiveView={onViewChange || (() => {})}
              searchTerm={searchTerm}
              setSearchTerm={onSearchChange || (() => {})}
              isConnected={isConnected}
              onViewSelect={onViewSelect}
              onViewSave={onViewSave}
              currentViewConfig={currentViewConfig}
            />
          </header>

          {/* Page Content */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto"
            role="main"
            aria-label="Dashboard content"
            tabIndex={-1}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  )
}

export default DashboardLayout
