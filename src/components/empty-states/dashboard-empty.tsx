'use client'

import { BaseEmptyState } from './base-empty-state'
import { FolderPlus, Play, Upload, Sparkles } from 'lucide-react'

interface DashboardEmptyProps {
  onCreateProject: () => void
  onTakeTour: () => void
  onImportProjects: () => void
}

export function DashboardEmpty({ 
  onCreateProject, 
  onTakeTour, 
  onImportProjects 
}: DashboardEmptyProps) {
  const illustration = (
    <div className="relative w-full h-full">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl" />
      
      {/* Project cards illustration */}
      <div className="absolute top-8 left-8 w-12 h-8 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-12" />
      <div className="absolute top-12 right-8 w-12 h-8 bg-white rounded-lg shadow-sm border border-gray-200 transform -rotate-6" />
      <div className="absolute bottom-16 left-12 w-12 h-8 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-6" />
      
      {/* Central focus element */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      <div className="absolute bottom-8 right-12 w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-16 left-4 w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  )

  return (
    <BaseEmptyState
      title="Welcome to Foco! Let's create your first project"
      description="Get started by creating your first project. You can break it down into tasks, invite your team, and track progress with AI-powered insights."
      illustration={illustration}
      primaryAction={{
        label: 'Create Your First Project',
        onClick: onCreateProject,
        variant: 'default'
      }}
      secondaryAction={{
        label: 'Take Product Tour',
        onClick: onTakeTour
      }}
      className="min-h-[500px]"
    >
      {/* Additional actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={onImportProjects}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import from CSV
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          AI-powered project breakdown
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-400 rounded-full" />
          Real-time collaboration
        </div>
      </div>

      {/* Quick start guide */}
      <div className="mt-12 max-w-lg mx-auto">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Quick Start Guide</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-blue-600 font-semibold text-sm">1</span>
            </div>
            <span className="text-xs text-gray-600">Create Project</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-purple-600 font-semibold text-sm">2</span>
            </div>
            <span className="text-xs text-gray-600">Add Tasks</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-green-600 font-semibold text-sm">3</span>
            </div>
            <span className="text-xs text-gray-600">Invite Team</span>
          </div>
        </div>
      </div>
    </BaseEmptyState>
  )
}
