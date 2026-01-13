'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, Users, Settings, Mail } from 'lucide-react'
import { Organization } from '../hooks/useOrganizations'

interface OrganizationCardProps {
  organization: Organization & { members_count?: number; projects_count?: number; role?: string }
  onCardClick: () => void
  onInviteClick: () => void
}

export function OrganizationCard({ organization, onCardClick, onInviteClick }: OrganizationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onCardClick}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{organization.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Created {new Date(organization.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onInviteClick()
              }}
              title="Invite member"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          {organization.description || 'No description provided'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {organization.members_count || 0} members
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {organization.role || 'Member'}
            </Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projects</span>
            <span className="font-medium">{organization.projects_count || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
