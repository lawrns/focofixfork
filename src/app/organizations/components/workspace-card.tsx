'use client';

import { Building, Mail, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkspaceCardProps {
  ws: any;
  onOpen: (ws: any) => void;
  onInvite: (ws: any) => void;
}

export function WorkspaceCard({ ws, onOpen, onInvite }: WorkspaceCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onOpen(ws)}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary rounded-lg flex-shrink-0 flex items-center justify-center">
              <Building className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">{ws.name}</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Created {new Date(ws.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onInvite(ws);
              }}
              title="Invite member"
              className="h-9 w-9 p-0"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm line-clamp-2">
          {ws.description || 'No description provided'}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {ws.members_count || 0} members
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {ws.role || 'Member'}
            </Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projects</span>
            <span className="font-medium">{ws.projects_count || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
