'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

interface InvitationData {
  email: string
  role: string
  workspace_name: string
  invited_by_name: string
  expires_at: string
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validateInvitation = useCallback(async () => {
    try {
      const response = await fetch(`/api/invitations/${token}/validate`)
      const result = await response.json()

      if (result.success) {
        setInvitation(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    validateInvitation()
  }, [token, validateInvitation])

  const acceptInvitation = async () => {
    setAccepting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to register with invitation context
        router.push(`/register?invitation=${token}`)
        return
      }

      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/organizations/${result.data.workspace_id}`)
        }, 2000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome to the team!</CardTitle>
            <CardDescription>
              You&apos;ve successfully joined {invitation?.workspace_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to your organization...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join {invitation?.workspace_name} on Foco
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>{invitation?.invited_by_name}</strong> has invited you to collaborate as a <strong>{invitation?.role}</strong> in <strong>{invitation?.workspace_name}</strong>.
            </p>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This invitation expires on {invitation?.expires_at && new Date(invitation.expires_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>

          <Button onClick={acceptInvitation} disabled={accepting} className="w-full">
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


