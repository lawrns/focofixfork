'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  Users,
  Palette,
  Zap,
  Shield,
  CreditCard,
  Bell,
  Plug,
  Brain,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useMobile } from '@/lib/hooks/use-mobile';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import { MembersSettings } from './components/MembersSettings';
import { AppearanceSettings } from './components/AppearanceSettings';
import { AIPolicySettings } from './components/AIPolicySettings';
import { NotificationSettings } from './components/NotificationSettings';
import { IntegrationsSettings } from './components/IntegrationsSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { BillingSettings } from './components/BillingSettings';
import { AgentPersonalitySettings } from './components/openclaw/AgentPersonalitySettings';

const settingsSections = [
  { id: 'workspace', label: 'Workspace', icon: Settings },
  { id: 'members', label: 'Members & Roles', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Policy', icon: Zap },
  { id: 'agent-personality', label: 'Agent Personality', icon: Brain },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('workspace');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const isMobile = useMobile();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.twoFactorEnabled || false);
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    fetchUserStatus();
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'workspace':
        return <WorkspaceSettings />;
      case 'members':
        return <MembersSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'ai':
        return <AIPolicySettings />;
      case 'agent-personality':
        return <AgentPersonalitySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'security':
        return <SecuritySettings twoFactorEnabled={twoFactorEnabled} />;
      case 'billing':
        return <BillingSettings />;
      default:
        return (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {settingsSections.find(s => s.id === activeSection)?.label} settings under development
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage workspace policy, memberships, appearance, integrations, and security in one place."
      />

      <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-3 sm:p-4 animate-slide-up">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="text-[10px]">Workspace Control Plane</Badge>
          <Badge variant="secondary" className="text-[10px]">Responsive Layout</Badge>
          <Badge variant="outline" className="text-[10px]">Section: {settingsSections.find(s => s.id === activeSection)?.label}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-5">
          {isMobile ? (
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(() => {
                    const section = settingsSections.find(s => s.id === activeSection);
                    return section ? (
                      <span className="flex items-center gap-2">
                        <section.icon className="h-4 w-4" />
                        {section.label}
                      </span>
                    ) : null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {settingsSections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <span className="flex items-center gap-2">
                      <section.icon className="h-4 w-4" />
                      {section.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <nav className="w-full shrink-0 lg:sticky lg:top-16 self-start">
              <div className="rounded-lg border bg-background/80 p-2 space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      activeSection === section.id
                        ? 'bg-secondary text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                    )}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </button>
                ))}
              </div>
            </nav>
          )}

          <div className="flex-1 min-w-0 animate-slide-up-delay">
            {renderContent()}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
