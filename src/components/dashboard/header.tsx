'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Menu, Search, Plus, HelpCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'

interface DashboardHeaderProps {
  selectedProject?: any
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activeView: 'table' | 'kanban' | 'gantt'
  setActiveView: (view: 'table' | 'kanban' | 'gantt') => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  isConnected: boolean
  onViewSelect?: (view: ViewConfig) => void
  onViewSave?: (name: string) => void
  currentViewConfig?: Omit<ViewConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedProject,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  searchTerm,
  setSearchTerm,
  isConnected,
  onViewSelect,
  onViewSave,
  currentViewConfig
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return '#10b981' // green
      case 'planning':
        return '#3b82f6' // blue
      case 'on-hold':
        return '#f59e0b' // amber
      default:
        return '#6b7280' // gray
    }
  }

  const getStatusBadge = (status?: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      'on-hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }

    const labels = {
      active: 'Active',
      planning: 'Planning',
      'on-hold': 'On Hold',
      completed: 'Completed'
    }

    return {
      color: colors[status as keyof typeof colors] || colors.completed,
      label: labels[status as keyof typeof labels] || status || 'Unknown'
    }
  }

  const statusInfo = getStatusBadge(selectedProject?.status)

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-30 w-full">
      {/* Branding bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-green-500"></div>

      <div className="px-4 sm:px-6 py-4 sm:py-4"> {/* Increased padding on mobile for better touch targets */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0 max-w-full">
          {/* Left Section - Navigation & Project Info */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="p-3 hover:bg-muted/60 rounded-lg transition-colors min-h-[48px] min-w-[48px]" // Larger touch target
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            {/* Project Info */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: getStatusColor(selectedProject?.status) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {selectedProject?.name || 'Select a Project'}
                  </h1>
                  <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                {selectedProject?.description && (
                  <p className="text-sm text-muted-foreground truncate hidden sm:block">
                    {selectedProject.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Controls & Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 min-w-0">
            {/* Connection Status */}
            <div className="hidden sm:flex xl:flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
              <span className={`text-xs font-medium ${isConnected ? 'text-success' : 'text-destructive'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Search */}
            <div className="relative hidden md:block lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-24 sm:w-32 xl:w-48 border rounded-lg text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/20 focus:outline-none bg-background border-border"
              />
            </div>

            {/* Saved Views */}
            <div className="hidden lg:flex">
              <SavedViews
                onViewSelect={onViewSelect || (() => {})}
                onViewSave={onViewSave || (() => {})}
                currentViewConfig={currentViewConfig}
              />
            </div>

            {/* View Toggle - Desktop */}
            <div className="hidden sm:flex rounded-lg border border-border p-1 bg-card">
              <button
                onClick={() => setActiveView('table')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 min-h-[48px] ${
                  activeView === 'table'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Table View - Detailed milestone list"
                aria-label="Switch to table view"
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-px">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
                <span className="hidden sm:inline lg:inline">Table</span>
              </button>
              <button
                onClick={() => setActiveView('kanban')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 min-h-[48px] ${
                  activeView === 'kanban'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Kanban View - Visual workflow"
                aria-label="Switch to kanban view"
              >
                <div className="w-4 h-4 flex space-x-px">
                  <div className="w-1 bg-current rounded-sm"></div>
                  <div className="w-1 bg-current rounded-sm"></div>
                  <div className="w-1 bg-current rounded-sm"></div>
                </div>
                <span className="hidden sm:inline lg:inline">Kanban</span>
              </button>
              <button
                onClick={() => setActiveView('gantt')}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 min-h-[48px] ${
                  activeView === 'gantt'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Gantt View - Timeline visualization"
                aria-label="Switch to gantt view"
              >
                <div className="w-4 h-4 flex items-end space-x-px">
                  <div className="w-1 h-2 bg-current rounded-sm"></div>
                  <div className="w-1 h-3 bg-current rounded-sm"></div>
                  <div className="w-1 h-1 bg-current rounded-sm"></div>
                  <div className="w-1 h-2 bg-current rounded-sm"></div>
                </div>
                <span className="hidden sm:inline lg:inline">Gantt</span>
              </button>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex sm:hidden rounded-lg border border-border p-1 bg-card">
              <button
                onClick={() => setActiveView('table')}
                className={`p-3 rounded-md transition-all duration-200 min-h-[48px] min-w-[48px] ${
                  activeView === 'table'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Table View"
                aria-label="Switch to table view"
              >
                <div className="w-5 h-5 grid grid-cols-2 gap-px">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setActiveView('kanban')}
                className={`p-3 rounded-md transition-all duration-200 min-h-[48px] min-w-[48px] ${
                  activeView === 'kanban'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Kanban View"
                aria-label="Switch to kanban view"
              >
                <div className="w-5 h-5 flex space-x-px">
                  <div className="w-1 bg-current rounded-sm"></div>
                  <div className="w-1 bg-current rounded-sm"></div>
                  <div className="w-1 bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setActiveView('gantt')}
                className={`p-3 rounded-md transition-all duration-200 min-h-[48px] min-w-[48px] ${
                  activeView === 'gantt'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/80'
                }`}
                title="Gantt View"
                aria-label="Switch to gantt view"
              >
                <div className="w-5 h-5 flex items-end space-x-px">
                  <div className="w-1 h-2 bg-current rounded-sm"></div>
                  <div className="w-1 h-3 bg-current rounded-sm"></div>
                  <div className="w-1 h-1 bg-current rounded-sm"></div>
                  <div className="w-1 h-2 bg-current rounded-sm"></div>
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {/* Mobile Menu */}
              <div className="relative lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2"
                  aria-label="More actions"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                {mobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-1rem)] bg-card rounded-md shadow-lg border border-border z-50">
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Invite Team</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center space-x-2">
                        <HelpCircle className="h-4 w-4" />
                        <span>Help & Docs</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Actions */}
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex items-center px-3 py-3 min-h-[48px] min-w-[48px]"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>

              {/* New Milestone Button */}
              <Button
                size="sm"
                className="flex flex-row items-center gap-2 px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 min-h-[48px]"
                title="New Milestone"
                aria-label="Create new milestone"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden lg:inline">New</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {selectedProject && (
          <div className="mt-4 sm:mt-6 px-4 sm:px-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span className="font-medium">Project Progress</span>
              <span className="font-semibold text-foreground">{selectedProject.progress || 0}% Complete</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${selectedProject.progress || 0}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default DashboardHeader


