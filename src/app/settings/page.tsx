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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/layout/page-shell';
import { useMobile } from '@/lib/hooks/use-mobile';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import { MembersSettings } from './components/MembersSettings';
import { AppearanceSettings } from './components/AppearanceSettings';
import { AIPolicySettings } from './components/AIPolicySettings';
import { NotificationSettings } from './components/NotificationSettings';
import { IntegrationsSettings } from './components/IntegrationsSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { BillingSettings } from './components/BillingSettings';

const settingsSections = [
  { id: 'workspace', label: 'Workspace', icon: Settings },
  { id: 'members', label: 'Members & Roles', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Policy', icon: Zap },
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
    <PageShell maxWidth="6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your workspace preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
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
          <nav className="w-56 shrink-0">
            <div className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeSection === section.id
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </PageShell>
  );
}
