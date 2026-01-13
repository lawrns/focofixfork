'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state-standard';
import { emptyStates, buttons } from '@/lib/copy';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  capacity: {
    current: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
  };
  tasks: {
    assigned: number;
    completed: number;
    overdue: number;
    blocked: number;
  };
  focusHours: number;
  timezone: string;
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-zinc-400',
};

function MemberCard({ member }: { member: TeamMember }) {
  const isOverloaded = member.capacity.current > 100;
  
  return (
    <div className={cn(
      'p-4 bg-white dark:bg-zinc-900 rounded-lg border',
      isOverloaded 
        ? 'border-red-200 dark:border-red-900/50' 
        : 'border-zinc-200 dark:border-zinc-800'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {member.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900',
              statusColors[member.status]
            )} />
          </div>
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              {member.name}
            </h3>
            <p className="text-xs text-zinc-500">{member.role}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View profile</DropdownMenuItem>
            <DropdownMenuItem>View tasks</DropdownMenuItem>
            <DropdownMenuItem>Reassign tasks</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Capacity</span>
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-xs font-medium',
              isOverloaded ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-50'
            )}>
              {member.capacity.current}%
            </span>
            {member.capacity.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
            {member.capacity.trend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
          </div>
        </div>
        <Progress 
          value={Math.min(member.capacity.current, 100)} 
          className={cn('h-1.5', isOverloaded && '[&>div]:bg-red-500')}
        />
        {isOverloaded && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overloaded
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {member.tasks.assigned}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase">Assigned</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-green-600">
            {member.tasks.completed}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase">Done</div>
        </div>
        <div>
          <div className={cn(
            'text-lg font-semibold',
            member.tasks.overdue > 0 ? 'text-red-500' : 'text-zinc-400'
          )}>
            {member.tasks.overdue}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase">Overdue</div>
        </div>
        <div>
          <div className={cn(
            'text-lg font-semibold',
            member.tasks.blocked > 0 ? 'text-amber-500' : 'text-zinc-400'
          )}>
            {member.tasks.blocked}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase">Blocked</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="h-3 w-3" />
          {member.focusHours}h focus today
        </div>
        <div className="text-xs text-zinc-400">
          {member.timezone}
        </div>
      </div>
    </div>
  );
}

function CapacityOverview({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;
  
  const totalCapacity = members.reduce((acc, m) => acc + m.capacity.current, 0) / members.length;
  const overloaded = members.filter(m => m.capacity.current > 100).length;
  const available = members.filter(m => m.capacity.current < 70).length;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Team Size</span>
          </div>
          <div className="text-2xl font-semibold">{members.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Avg Capacity</span>
          </div>
          <div className="text-2xl font-semibold">{Math.round(totalCapacity)}%</div>
        </CardContent>
      </Card>
      
      <Card className={overloaded > 0 ? 'border-red-200 dark:border-red-900/50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Overloaded</span>
          </div>
          <div className={cn('text-2xl font-semibold', overloaded > 0 && 'text-red-500')}>
            {overloaded}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Available</span>
          </div>
          <div className="text-2xl font-semibold text-green-600">{available}</div>
        </CardContent>
      </Card>
    </div>
  );
}

const aiInsightsMock = [
  {
    id: '1',
    type: 'warning',
    title: 'High capacity warning',
    description: 'Some team members are approaching or exceeding 100% capacity.',
    confidence: 0.92,
  },
  {
    id: '2',
    type: 'suggestion',
    title: 'Workload balancing',
    description: 'AI suggests redistributing tasks to members with available capacity.',
    confidence: 0.88,
  },
];

function AIInsights() {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

  const handleApply = (insightId: string) => {
    // TODO: Implement apply logic based on insight type
    toast.success('Insight applied! This feature is coming soon.');
    setDismissedInsights([...dismissedInsights, insightId]);
  };

  const handleDismiss = (insightId: string) => {
    setDismissedInsights([...dismissedInsights, insightId]);
    toast('Insight dismissed');
  };

  const visibleInsights = aiInsightsMock.filter(
    (insight) => !dismissedInsights.includes(insight.id)
  );

  if (visibleInsights.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleInsights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              'p-3 rounded-lg border',
              insight.type === 'warning'
                ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50'
                : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {insight.type === 'warning' && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {insight.description}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {Math.round(insight.confidence * 100)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => handleApply(insight.id)}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => handleDismiss(insight.id)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PeoplePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'roster' | 'capacity'>('roster');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get current workspace from localStorage or use default
      const currentWorkspaceSlug = localStorage.getItem('lastWorkspace') || 'fyves-team';

      // First, get all workspaces to find the workspace ID
      const workspacesRes = await fetch('/api/workspaces');
      const workspacesData = await workspacesRes.json();

      const currentWorkspace = workspacesData.workspaces?.find(
        (w: any) => w.slug === currentWorkspaceSlug
      );

      if (!currentWorkspace) {
        console.error('No workspace found');
        setMembers([]);
        return;
      }

      // Fetch workspace members using the correct endpoint
      const membersRes = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
      const membersData = await membersRes.json();

      if (membersData.success && membersData.data) {
        setMembers(membersData.data.map((m: any) => ({
          id: m.user_id,
          name: m.user_name || m.email?.split('@')[0] || 'Unknown',
          email: m.email || '',
          role: m.role || 'Member',
          avatar: m.user?.avatar_url,
          status: 'online',
          capacity: {
            current: m.capacity_hours_per_week ? Math.round((m.focus_hours_per_day * 5 / m.capacity_hours_per_week) * 100) : 80,
            max: 100,
            trend: 'stable'
          },
          tasks: { assigned: 0, completed: 0, overdue: 0, blocked: 0 },
          focusHours: m.focus_hours_per_day || 4,
          timezone: m.timezone || 'UTC'
        })));
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="People" subtitle="Loading team..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="People"
        subtitle={`${members.length} team members`}
        primaryAction={
          <Button onClick={() => setShowInviteDialog(true)}>
            <Plus className="h-4 w-4" />
            {buttons.inviteMember}
          </Button>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mb-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Tabs>

      <CapacityOverview members={members} />
      <AIInsights />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <EmptyState
          icon={Users}
          title={search ? emptyStates.peopleSearch.title : emptyStates.people.title}
          description={search ? `No team members matching &quot;${search}&quot;` : emptyStates.people.description}
          primaryAction={search ? {
            label: emptyStates.peopleSearch.primaryCta,
            onClick: () => setSearch(''),
          } : {
            label: emptyStates.people.primaryCta,
            onClick: () => {},
          }}
        />
      )}

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Input
                id="invite-role"
                placeholder="Member"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Invitation feature coming soon!');
                setShowInviteDialog(false);
              }}
            >
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
