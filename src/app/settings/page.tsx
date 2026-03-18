'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { HeroSection } from '@/components/cinematic/hero-section';
import { GlassCard } from '@/components/cinematic/glass-card';
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
    <PageShell className="space-y-4">
      <HeroSection
        title="Settings"
        subtitle="Manage workspace policy, memberships, appearance, integrations, and security."
        badge={
          <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
            {settingsSections.find(s => s.id === activeSection)?.label}
          </Badge>
        }
      />

      <GlassCard hover={false} className="p-3 sm:p-4">
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
              <div className="rounded-lg border border-zinc-800/50 bg-[#0a0b0d]/80 p-2 space-y-0.5">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      activeSection === section.id
                        ? 'bg-[color:var(--foco-teal-dim)] text-foreground border-l-2 border-l-[color:var(--foco-teal)]'
                        : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground border-l-2 border-l-transparent'
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </GlassCard>
    </PageShell>
  );
}
