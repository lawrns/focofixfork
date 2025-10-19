'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronLeft, 
  ChevronRight, 
  Building, 
  Users, 
  Settings, 
  CheckCircle,
  Mail,
  UserPlus,
  Sparkles,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ReactNode
}

export function SetupWizard({ isOpen, onClose, onComplete }: SetupWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  
  // Form data
  const [organizationName, setOrganizationName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    language: 'es'
  })

  const totalSteps = 5
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      setCompletedSteps(prev => new Set([...prev, currentStep]))
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      // TODO: Implement actual setup logic
      console.log('Setting up:', {
        organizationName,
        projectName,
        projectDescription,
        inviteEmails: inviteEmails.filter(email => email.trim()),
        preferences
      })

      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))

      setCompletedSteps(prev => new Set([...prev, currentStep]))
      onComplete()
      
      // Navigate to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Setup failed:', error)
    }
  }

  const handleSkip = () => {
    onClose()
    router.push('/dashboard')
  }

  const addInviteEmail = () => {
    setInviteEmails([...inviteEmails, ''])
  }

  const removeInviteEmail = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index))
  }

  const updateInviteEmail = (index: number, value: string) => {
    const newEmails = [...inviteEmails]
    newEmails[index] = value
    setInviteEmails(newEmails)
  }

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Foco!',
      description: 'Let\'s set up your workspace in just a few steps',
      icon: <Sparkles className="w-6 h-6" />,
      component: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Get Started with Foco
            </h3>
            <p className="text-gray-600">
              We&apos;ll help you create your organization, set up your first project, 
              and invite your team members. This will only take a few minutes.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <span className="text-xs text-gray-600">Organization</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-purple-600 font-semibold text-sm">2</span>
              </div>
              <span className="text-xs text-gray-600">First Project</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-green-600 font-semibold text-sm">3</span>
              </div>
              <span className="text-xs text-gray-600">Team Setup</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'organization',
      title: 'Create Your Organization',
      description: 'Set up your organization for team collaboration',
      icon: <Building className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Organization Setup
            </h3>
            <p className="text-gray-600">
              Organizations help you collaborate with your team and manage permissions.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Organization Benefits</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Centralized team management</li>
                <li>• Shared project workspace</li>
                <li>• Permission controls</li>
                <li>• Unified billing</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'project',
      title: 'Create Your First Project',
      description: 'Set up your first project to get started',
      icon: <CheckCircle className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              First Project
            </h3>
            <p className="text-gray-600">
              Create your first project to start organizing your work.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Describe your project"
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">What&apos;s Next?</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Break down into tasks</li>
                <li>• Set deadlines and priorities</li>
                <li>• Invite team members</li>
                <li>• Track progress with AI insights</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add team members to collaborate on your project',
      icon: <Users className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Team Collaboration
            </h3>
            <p className="text-gray-600">
              Invite team members to start collaborating. You can always add more later.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              {inviteEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => updateInviteEmail(index, e.target.value)}
                    className="flex-1"
                  />
                  {inviteEmails.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeInviteEmail(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={addInviteEmail}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Another Email
            </Button>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Team Benefits</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Real-time collaboration</li>
                <li>• Shared project visibility</li>
                <li>• Comment and mention system</li>
                <li>• Automatic notifications</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'preferences',
      title: 'Set Your Preferences',
      description: 'Customize your Foco experience',
      icon: <Settings className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Preferences
            </h3>
            <p className="text-gray-600">
              Customize your experience to match your workflow.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Get notified about project updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Dark Mode</h4>
                  <p className="text-sm text-gray-600">Use dark theme interface</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.darkMode}
                  onChange={(e) => setPreferences(prev => ({ ...prev, darkMode: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">You&apos;re All Set!</h4>
              <p className="text-sm text-gray-600">
                Your workspace is ready. You can always change these settings later in your profile.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ]

  if (!isOpen) return null

  const currentStepData = steps[currentStep]
  const canProceed = () => {
    switch (currentStep) {
      case 1: return organizationName.trim().length > 0
      case 2: return projectName.trim().length > 0
      default: return true
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Wizard */}
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                <p className="text-sm text-gray-600">{currentStepData.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {currentStepData.component}
        </CardContent>
        
        {/* Footer */}
        <div className="border-t p-6 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip Setup
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Next'}
              {currentStep < totalSteps - 1 && (
                <ChevronRight className="w-4 h-4 ml-1" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Hook for managing setup wizard state
export function useSetupWizard() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    // Check if user has completed setup
    const completed = localStorage.getItem('foco-setup-completed')
    setHasCompleted(completed === 'true')
  }, [])

  const startWizard = () => {
    setIsOpen(true)
  }

  const closeWizard = () => {
    setIsOpen(false)
  }

  const completeWizard = () => {
    setIsOpen(false)
    setHasCompleted(true)
    localStorage.setItem('foco-setup-completed', 'true')
  }

  const resetWizard = () => {
    setHasCompleted(false)
    localStorage.removeItem('foco-setup-completed')
  }

  return {
    isOpen,
    hasCompleted,
    startWizard,
    closeWizard,
    completeWizard,
    resetWizard
  }
}
