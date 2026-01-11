'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Menu, Search, Plus, HelpCircle, Users, LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase-client'

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
  const { user } = useAuth()
  const router = useRouter()

  // Use actual user data - no fallback to fake data
  const displayUser = user
  const avatarText = displayUser?.email?.charAt(0).toUpperCase() || '?'

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
      planning: 'bg-blue-500 text-white dark:bg-blue-900/40 dark:text-blue-300',
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
    <header className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-30 w-full">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
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
                aria-label="Search projects, tasks, and milestones"
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

            {/* User Avatar with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-9 md:size-11 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer">
                  <span className="text-xs md:text-sm font-semibold text-primary">
                    {avatarText}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayUser?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayUser?.user_metadata?.full_name || 'User'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signOut();
                      if (error) throw error;
                      router.push('/login');
                    } catch (err) {
                      console.error('Sign out failed:', err);
                    }
                  }}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
          <div className="mt-4 sm:mt-5">
            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedProject.progress || 0}%</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-zinc-900 dark:bg-zinc-100 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${selectedProject.progress || 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default DashboardHeader


