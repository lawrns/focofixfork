'use client';

import { useState } from 'react';
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

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@acme.com',
    role: 'Design Lead',
    status: 'online',
    capacity: { current: 85, max: 100, trend: 'up' },
    tasks: { assigned: 8, completed: 12, overdue: 0, blocked: 0 },
    focusHours: 6,
    timezone: 'PST',
  },
  {
    id: '2',
    name: 'Mike Johnson',
    email: 'mike@acme.com',
    role: 'Senior Engineer',
    status: 'busy',
    capacity: { current: 110, max: 100, trend: 'up' },
    tasks: { assigned: 12, completed: 8, overdue: 2, blocked: 1 },
    focusHours: 4,
    timezone: 'EST',
  },
  {
    id: '3',
    name: 'Alex Kim',
    email: 'alex@acme.com',
    role: 'Frontend Developer',
    status: 'online',
    capacity: { current: 72, max: 100, trend: 'stable' },
    tasks: { assigned: 6, completed: 15, overdue: 0, blocked: 0 },
    focusHours: 5,
    timezone: 'PST',
  },
  {
    id: '4',
    name: 'Lisa Park',
    email: 'lisa@acme.com',
    role: 'Product Manager',
    status: 'away',
    capacity: { current: 45, max: 100, trend: 'down' },
    tasks: { assigned: 4, completed: 6, overdue: 0, blocked: 0 },
    focusHours: 3,
    timezone: 'CST',
  },
  {
    id: '5',
    name: 'James Wilson',
    email: 'james@acme.com',
    role: 'Backend Developer',
    status: 'offline',
    capacity: { current: 92, max: 100, trend: 'stable' },
    tasks: { assigned: 7, completed: 10, overdue: 1, blocked: 0 },
    focusHours: 6,
    timezone: 'GMT',
  },
];

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-zinc-400',
};

const aiInsights = [
  {
    id: '1',
    type: 'warning',
    title: 'Mike is at 110% capacity',
    description: 'Consider reassigning "API Integration" to balance workload',
    confidence: 0.92,
  },
  {
    id: '2',
    type: 'suggestion',
    title: 'Lisa has available capacity',
    description: 'Could take on 2-3 more tasks from the Mobile App v2 project',
    confidence: 0.88,
  },
];

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

      {/* Capacity */}
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

      {/* Task Stats */}
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

      {/* Footer */}
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

function CapacityOverview() {
  const totalCapacity = teamMembers.reduce((acc, m) => acc + m.capacity.current, 0) / teamMembers.length;
  const overloaded = teamMembers.filter(m => m.capacity.current > 100).length;
  const available = teamMembers.filter(m => m.capacity.current < 70).length;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Team Size</span>
          </div>
          <div className="text-2xl font-semibold">{teamMembers.length}</div>
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

function AIInsights() {
  return (
    <Card className="mb-6 border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {aiInsights.map((insight) => (
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
              <Button size="sm" variant="default" className="h-7 text-xs">
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs">
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
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'roster' | 'capacity'>('roster');

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            People
          </h1>
          <p className="text-zinc-500 mt-1">
            {teamMembers.length} team members
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Tabs */}
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

      {/* Capacity Overview */}
      <CapacityOverview />

      {/* AI Insights */}
      <AIInsights />

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="py-12 text-center">
          <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-1">
            No people found
          </h3>
          <p className="text-zinc-500">
            No team members matching "{search}"
          </p>
        </div>
      )}
    </div>
  );
}
