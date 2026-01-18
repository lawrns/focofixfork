'use client'

import { BaseEmptyState } from './base-empty-state'
import { Building2, Users, Shield, CreditCard, Plus, UserPlus } from 'lucide-react'

interface WorkspacesEmptyProps {
  onCreateWorkspace: () => void
  onJoinWorkspace: () => void
}

export function WorkspacesEmpty({ 
  onCreateWorkspace, 
  onJoinWorkspace 
}: WorkspacesEmptyProps) {
  const illustration = (
    <div className="relative w-full h-full">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl" />
      
      {/* Building elements */}
      <div className="absolute top-8 left-8 w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-6">
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <div className="absolute top-16 right-8 w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 transform -rotate-3">
        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-purple-600" />
        </div>
      </div>
      
      <div className="absolute bottom-12 left-12 w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 transform rotate-3">
        <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
      </div>
      
      {/* Central plus icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Plus className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  )

  return (
    <BaseEmptyState
      title="Create or join a workspace"
      description="Workspaces help you collaborate with your team, manage permissions, and centralize projects. Create your own or join an existing one."
      illustration={illustration}
      primaryAction={{
        label: 'Create Workspace',
        onClick: onCreateWorkspace,
        variant: 'default'
      }}
      secondaryAction={{
        label: 'Join Workspace',
        onClick: onJoinWorkspace
      }}
    >
      {/* Workspace benefits */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Workspace benefits</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              icon: <Users className="w-5 h-5 text-blue-600" />, 
              title: 'Team Collaboration', 
              description: 'Work together on shared projects' 
            },
            { 
              icon: <Shield className="w-5 h-5 text-purple-600" />, 
              title: 'Permission Management', 
              description: 'Control who can access what' 
            },
            { 
              icon: <CreditCard className="w-5 h-5 text-green-600" />, 
              title: 'Centralized Billing', 
              description: 'One bill for your entire team' 
            }
          ].map((benefit, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {benefit.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{benefit.title}</div>
                <div className="text-xs text-gray-600">{benefit.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={onCreateWorkspace}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Start your own workspace
        </button>
        
        <button
          onClick={onJoinWorkspace}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Join with invitation code
        </button>
      </div>

      {/* Help text */}
      <div className="mt-6 text-xs text-gray-500 text-center max-w-md mx-auto">
        You can always create or join workspaces later. Workspaces are optional but recommended for team collaboration.
      </div>
    </BaseEmptyState>
  )
}
