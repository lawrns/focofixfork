'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, RefreshCw, Brain, User, Sparkles, Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { PersonalityConfig } from '@/lib/openclaw/types';
import { IdentityTab } from './tabs/IdentityTab';
import { SoulTab } from './tabs/SoulTab';
import { AgentsTab } from './tabs/AgentsTab';
import { UserTab } from './tabs/UserTab';
import { HeartbeatTab } from './tabs/HeartbeatTab';

export function AgentPersonalitySettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [config, setConfig] = useState<PersonalityConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load personality config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/openclaw/personality');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setHasChanges(false);
      } else {
        toast.error(result.error || 'Failed to load personality configuration');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('Failed to load personality configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/openclaw/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Personality configuration saved successfully');
        setHasChanges(false);
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (section: keyof PersonalityConfig, value: unknown) => {
    if (!config) return;
    setConfig({ ...config, [section]: value });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load personality configuration</p>
          <Button onClick={loadConfig} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Agent Personality
              </CardTitle>
              <CardDescription className="mt-1.5">
                Customize how your AI assistant behaves, communicates, and responds to tasks.
                These settings are written to OpenClaw workspace files.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="secondary" className="text-amber-600">
                  Unsaved changes
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="relative"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Preview Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{config.identity.emoji}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{config.identity.name}</h3>
              <p className="text-sm text-muted-foreground">
                {config.identity.tagline || `${config.identity.creature} assistant with ${config.soul.communicationStyle.tone} tone`}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{config.soul.communicationStyle.tone}</Badge>
              <Badge variant="outline">{config.agents.codeStandards.language}</Badge>
              <Badge variant={config.heartbeat.enabled ? 'default' : 'secondary'}>
                {config.heartbeat.enabled ? 'Heartbeat on' : 'Heartbeat off'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Identity</span>
          </TabsTrigger>
          <TabsTrigger value="soul" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Soul</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Behavior</span>
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">User Context</span>
          </TabsTrigger>
          <TabsTrigger value="heartbeat" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Automation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-6">
          <IdentityTab
            config={config.identity}
            onChange={(identity) => handleConfigChange('identity', identity)}
          />
        </TabsContent>

        <TabsContent value="soul" className="mt-6">
          <SoulTab
            config={config.soul}
            onChange={(soul) => handleConfigChange('soul', soul)}
          />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentsTab
            config={config.agents}
            onChange={(agents) => handleConfigChange('agents', agents)}
          />
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <UserTab
            config={config.user}
            onChange={(user) => handleConfigChange('user', user)}
          />
        </TabsContent>

        <TabsContent value="heartbeat" className="mt-6">
          <HeartbeatTab
            config={config.heartbeat}
            onChange={(heartbeat) => handleConfigChange('heartbeat', heartbeat)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
