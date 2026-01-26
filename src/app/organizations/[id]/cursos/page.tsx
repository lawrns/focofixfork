'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  Clock,
  Play,
  CheckCircle,
  Circle,
  Trophy,
  Users,
  Loader2,
  Lock,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLoadingSkeleton } from '@/components/skeleton-screens'

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  is_published: boolean
  sort_order: number
  sections: any[]
  completedSections: number
  totalSections: number
  progressPercentage: number
  status: 'not_started' | 'in_progress' | 'completed'
}

interface CertifiedMember {
  id: string
  certification_level: string
  certified_at: string
  user: {
    id: string
    email: string
    raw_user_meta_data: any
  }
  course: {
    id: string
    title: string
  }
}

export default function CursosPage() {
  return (
    <ProtectedRoute>
      <CursosContent />
    </ProtectedRoute>
  )
}

function CursosContent() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const { user } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [certifiedMembers, setCertifiedMembers] = useState<CertifiedMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)

  // Check access control first
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/cursos/check-access?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          if (!data.authorized) {
            setAccessError('Área restringida a miembros de Fyves')
            setTimeout(() => {
              router.push('/dashboard?error=cursos_restricted_fyves_only')
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Error checking access:', error)
      } finally {
        setIsCheckingAccess(false)
      }
    }

    checkAccess()
  }, [workspaceId, router])

  const loadCourses = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/cursos?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Failed to load courses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  const loadCertifiedMembers = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/cursos/certified?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setCertifiedMembers(data.members || [])
      }
    } catch (error) {
      console.error('Failed to load certified members:', error)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!isCheckingAccess) {
      loadCourses()
      loadCertifiedMembers()
    }
  }, [isCheckingAccess, loadCourses, loadCertifiedMembers])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive" className="max-w-md mx-auto mt-8">
            <Lock className="h-4 w-4" />
            <AlertDescription>{accessError}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <PageLoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href={`/organizations/${workspaceId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
            <p className="text-muted-foreground">
              Academia interna de Vibe Coding de Fyves
            </p>
          </div>
        </motion.div>

        {/* Certified Members Section */}
        {certifiedMembers.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card variant="ghost" className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  Miembros Certificados
                </CardTitle>
                <CardDescription>
                  {certifiedMembers.length} {certifiedMembers.length === 1 ? 'miembro' : 'miembros'} han completado el curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {certifiedMembers.map((member) => (
                    <Badge
                      key={member.id}
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {member.user.email?.split('@')[0]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Courses Grid */}
        {hasMounted && (
          <AnimatePresence>
            {courses.length === 0 ? (
              <motion.div
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cursos disponibles</h3>
                <p className="text-muted-foreground">
                  Los cursos aparecerán aquí cuando estén publicados.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    workspaceId={workspaceId}
                    index={index}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

interface CourseCardProps {
  course: Course
  workspaceId: string
  index: number
}

function CourseCard({ course, workspaceId, index }: CourseCardProps) {
  const getStatusIcon = () => {
    switch (course.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Circle className="h-5 w-5 text-blue-600 fill-blue-600/20" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = () => {
    switch (course.status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Completado
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            En progreso
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            No iniciado
          </Badge>
        )
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card variant="ghost" className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <CardTitle className="text-xl">{course.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {course.description}
              </CardDescription>
            </div>
            {getStatusIcon()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {getStatusBadge()}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">{course.progressPercentage}%</span>
            </div>
            <Progress value={course.progressPercentage} className="h-2" />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {course.completedSections}/{course.totalSections} lecciones
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href={`/organizations/${workspaceId}/cursos/${course.slug}`} className="w-full">
            <Button className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {course.status === 'not_started' ? 'Comenzar' : course.status === 'completed' ? 'Repasar' : 'Continuar'}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
