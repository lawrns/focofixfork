'use client'

import { BaseEmptyState } from './base-empty-state'
import { FolderPlus, Filter, RefreshCw, FileText, Users, Calendar } from 'lucide-react'

interface ProjectsEmptyProps {
  onCreateProject: () => void
  onImportProjects: () => void
  onResetFilters: () => void
  isFiltered: boolean
}

export function ProjectsEmpty({ 
  onCreateProject, 
  onImportProjects, 
  onResetFilters,
  isFiltered 
}: ProjectsEmptyProps) {
  if (isFiltered) {
    return (
      <BaseEmptyState
        icon={<Filter className="w-16 h-16" />}
        title="No projects match your filters"
        description="Try adjusting your search criteria or clearing filters to see all projects."
        primaryAction={{
          label: 'Clear Filters',
          onClick: onResetFilters,
          variant: 'outline'
        }}
        secondaryAction={{
          label: 'Create New Project',
          onClick: onCreateProject
        }}
      />
    )
  }

  const illustration = (
    <div className="relative w-full h-full">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl" />
      
      {/* Project folders */}
      <div className="absolute top-8 left-8 w-16 h-12 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-6">
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      
      <div className="absolute top-16 right-8 w-16 h-12 bg-white rounded-lg shadow-sm border border-gray-200 transform -rotate-3">
        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-purple-600" />
        </div>
      </div>
      
      <div className="absolute bottom-12 left-12 w-16 h-12 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-3">
        <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
          <Calendar className="w-6 h-6 text-green-600" />
        </div>
      </div>
      
      {/* Central plus icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <FolderPlus className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  )

  return (
    <BaseEmptyState
      title="No projects yet"
      description="Create your first project to start organizing your work. You can also import existing projects or start with a template."
      illustration={illustration}
      primaryAction={{
        label: 'Create New Project',
        onClick: onCreateProject,
        variant: 'default'
      }}
      secondaryAction={{
        label: 'Import Projects',
        onClick: onImportProjects
      }}
    >
      {/* Project templates */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Start with a template</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Website Launch', icon: '🌐', color: 'bg-blue-100 text-blue-600' },
            { name: 'Product Development', icon: '🚀', color: 'bg-purple-100 text-purple-600' },
            { name: 'Event Planning', icon: '📅', color: 'bg-green-100 text-green-600' },
            { name: 'Marketing Campaign', icon: '📢', color: 'bg-orange-100 text-orange-600' }
          ].map((template) => (
            <button
              key={template.name}
              onClick={onCreateProject}
              className={`p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${template.color}`}
            >
              <div className="text-lg mb-1">{template.icon}</div>
              <div className="text-xs font-medium">{template.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features highlight */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full" />
          AI-powered task suggestions
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          Team collaboration tools
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          Progress tracking
        </div>
      </div>
    </BaseEmptyState>
  )
}
