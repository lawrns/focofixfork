'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Users,
  Mail,
  Shield,
  Crown,
  User,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { InvitationWithDetails, InvitationModel } from '@/lib/models/invitations'
import { MemberRole } from '@/lib/models/organization-members'

export default function InvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Onboarding form state
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    validateInvitation()
  }, [token])

  const validateInvitation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/invitations/${token}/validate`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invitation not found or expired')
        } else {
          setError('Failed to validate invitation')
        }
        return
      }

      const data = await response.json()
      if (data.success) {
        setInvitation(data.invitation)
      } else {
        setError(data.error || 'Invalid invitation')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitation) return

    // Check if user needs to register first
    const needsRegistration = !invitation.email /* check if user exists */

    if (needsRegistration) {
      setShowOnboarding(true)
      return
    }

    await acceptInvitation()
  }

  const acceptInvitation = async () => {
    if (!invitation) return

    setIsAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'director':
        return <Crown className="w-5 h-5" />
      case 'lead':
        return <Shield className="w-5 h-5" />
      case 'member':
        return <User className="w-5 h-5" />
    }
  }

  const getRoleColor = (role: MemberRole) => {
    switch (role) {
      case 'director':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'lead':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Welcome to the Team!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              You've successfully joined {invitation?.organization_name}. Redirecting to your dashboard...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!showOnboarding ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Building className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{invitation.organization_name}</span>
                </div>

                <p className="text-muted-foreground">
                  You've been invited to join as a team member
                </p>

                <div className="flex items-center justify-center gap-2">
                  <Badge className={`${getRoleColor(invitation.role)} flex items-center gap-1`}>
                    {getRoleIcon(invitation.role)}
                    <span className="capitalize">{invitation.role}</span>
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  Invited by {invitation.invited_by_name || 'a team member'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Expires {new Date(invitation.expires_at).toLocaleDateString()}</span>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    As a {invitation.role}, you'll have access to {invitation.role === 'director' ? 'full organization management' : invitation.role === 'lead' ? 'project and team management' : 'project collaboration'} features.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/')}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Accept Invitation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="font-medium mb-2">Complete Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Create your account to join {invitation.organization_name}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowOnboarding(false)}
                  disabled={isAccepting}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={acceptInvitation}
                  disabled={!name.trim() || !password || password !== confirmPassword || isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


