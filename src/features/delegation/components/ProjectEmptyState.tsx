'use client'

import Link from 'next/link'
import { FolderKanban, Plus, ArrowRight, Bot, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectEmptyStateProps {
  workspaceId: string
  hasProjects?: boolean
}

export function ProjectEmptyState({ workspaceId, hasProjects = false }: ProjectEmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[color:var(--foco-teal)] to-purple-600 mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Welcome to AI-Powered Project Management</h1>
        <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
          Get started in three simple steps. Create a project, add tasks, and delegate them to AI agents.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { id: 'create-project', title: '1. Create a Project', description: 'Set up your first project to organize work', icon: FolderKanban, action: 'Create Project', href: '/projects?create=true', color: 'bg-blue-500', enabled: true },
          { id: 'create-task', title: '2. Add Tasks', description: 'Break down your project into actionable tasks', icon: CheckCircle2, action: 'Add Tasks', href: '#', color: 'bg-green-500', enabled: false },
          { id: 'delegate', title: '3. Delegate to AI', description: 'Assign tasks to AI agents for execution', icon: Bot, action: 'Delegate', href: '#', color: 'bg-purple-500', enabled: false }
        ].map((step) => {
          const Icon = step.icon
          return (
            <Card key={step.id} className={!step.enabled ? 'opacity-50 cursor-not-allowed' : ''}>
              <CardHeader>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${step.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {step.enabled ? (
                  <Button asChild className="w-full">
                    <Link href={step.href}>
                      {step.action}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Create a project first</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectEmptyState
