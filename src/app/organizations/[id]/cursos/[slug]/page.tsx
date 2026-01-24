'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  Clock,
  CheckCircle,
  Circle,
  Lock,
  Play,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface Section {
  id: string
  title: string
  content_type: 'video' | 'markdown' | 'exercise' | 'checkpoint'
  content_url: string | null
  content: string | null
  sort_order: number
  duration_minutes: number
}

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  sections: Section[]
}

interface UserProgress {
  completed_section_ids: string[]
  last_position: number
  is_completed: boolean
}

export default function CoursePlayerPage() {
  return (
    <ProtectedRoute>
      <CoursePlayerContent />
    </ProtectedRoute>
  )
}

function CoursePlayerContent() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const courseSlug = params.slug as string
  const { user } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Load course data
  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response = await fetch(`/api/cursos/${courseSlug}?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setCourse(data.course)

          // Set current section from progress
          if (data.progress?.last_position !== undefined) {
            setCurrentSectionIndex(data.progress.last_position)
          }
          setProgress(data.progress)
        } else {
          setError('No se pudo cargar el curso')
        }
      } catch (err) {
        console.error('Failed to load course:', err)
        setError('Error al cargar el curso')
      } finally {
        setIsLoading(false)
      }
    }

    loadCourse()
  }, [courseSlug, workspaceId])

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const saveProgress = async () => {
      if (!course || !user) return

      setIsSaving(true)
      try {
        await fetch('/api/cursos/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            lastPosition: currentSectionIndex,
          }),
        })
      } catch (err) {
        console.error('Failed to save progress:', err)
      } finally {
        setIsSaving(false)
      }
    }

    autoSaveTimer.current = setInterval(saveProgress, 30000)

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current)
      }
    }
  }, [course, currentSectionIndex, user])

  // Save progress when section changes
  const handleSectionChange = useCallback(async (newIndex: number) => {
    if (!course || !user) return

    const section = course.sections[newIndex]

    // Mark current section as completed when moving forward
    if (newIndex > currentSectionIndex) {
      const currentSectionId = course.sections[currentSectionIndex].id
      try {
        await fetch('/api/cursos/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            sectionId: currentSectionId,
            lastPosition: newIndex,
          }),
        })

        // Update local progress
        setProgress(prev => ({
          completed_section_ids: [...(prev?.completed_section_ids || []), currentSectionId],
          last_position: newIndex,
          is_completed: false,
        }))
      } catch (err) {
        console.error('Failed to update progress:', err)
      }
    }

    setCurrentSectionIndex(newIndex)
  }, [course, currentSectionIndex, user])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    )
  }

  if (error || !course) {
    return (
      <MainLayout>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Curso no encontrado'}</AlertDescription>
        </Alert>
      </MainLayout>
    )
  }

  const currentSection = course.sections[currentSectionIndex]
  const isSectionCompleted = progress?.completed_section_ids?.includes(currentSection?.id)
  const totalSections = course.sections.length
  const completedCount = progress?.completed_section_ids?.length || 0
  const progressPercentage = Math.round((completedCount / totalSections) * 100)

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/organizations/${workspaceId}/cursos`}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Volver a Cursos
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{course.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Sección {currentSectionIndex + 1} de {totalSections}
                </p>
              </div>
            </div>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tu progreso</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Content Area */}
            <motion.div
              key={currentSectionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto"
            >
              <SectionContent section={currentSection} />
            </motion.div>

            {/* Section Navigation */}
            <div className="w-80 border-l bg-muted/30 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Contenido del curso</h3>
                <div className="space-y-2">
                  {course.sections.map((section, index) => {
                    const isCompleted = progress?.completed_section_ids?.includes(section.id)
                    const isCurrent = index === currentSectionIndex
                    const isLocked = index > currentSectionIndex && !isCompleted

                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => !isLocked && handleSectionChange(index)}
                        disabled={isLocked}
                        whileHover={!isLocked ? { x: 4 } : {}}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isLocked
                            ? 'bg-muted/50 opacity-50 cursor-not-allowed'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isLocked ? (
                              <Lock className="h-4 w-4" />
                            ) : isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : isCurrent ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-2">
                              {section.title}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {section.duration_minutes} min
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => handleSectionChange(currentSectionIndex - 1)}
            disabled={currentSectionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {isSectionCompleted && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completado
              </Badge>
            )}
          </div>

          <Button
            onClick={() => handleSectionChange(currentSectionIndex + 1)}
            disabled={currentSectionIndex === totalSections - 1}
          >
            {currentSectionIndex === totalSections - 1 ? 'Finalizar' : 'Siguiente'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}

interface SectionContentProps {
  section: Section
}

function SectionContent({ section }: SectionContentProps) {
  const renderContent = () => {
    switch (section.content_type) {
      case 'markdown':
        return (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{section.content || ''}</ReactMarkdown>
          </div>
        )

      case 'video':
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {section.content_url ? (
              <video
                src={section.content_url}
                controls
                className="w-full h-full"
              >
                Tu navegador no soporta videos.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Video no disponible</p>
                </div>
              </div>
            )}
          </div>
        )

      case 'checkpoint':
        return (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Checkpoint</h3>
                  <p className="text-muted-foreground mb-4">
                    Completa este ejercicio para continuar con la siguiente sección.
                  </p>
                  {section.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'exercise':
        return (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <BookOpen className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Ejercicio</h3>
                  {section.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tipo de contenido no soportado: {section.content_type}
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-6">{section.title}</h2>
          {renderContent()}
        </motion.div>
      </div>
    </div>
  )
}
