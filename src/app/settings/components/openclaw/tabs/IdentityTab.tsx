'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IdentityConfig } from '@/lib/openclaw/types';

interface IdentityTabProps {
  config: IdentityConfig;
  onChange: (config: IdentityConfig) => void;
}

const EMOJI_OPTIONS = ['🦞', '🤖', '🧠', '⚡', '🔮', '🎯', '🚀', '💡', '🔧', '🎨', '🐙', '🦁'];

const THEME_OPTIONS = [
  { value: 'lobster', label: 'Lobster (Classic)' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'playful', label: 'Playful' },
] as const;

const CREATURE_OPTIONS = [
  { value: 'ai', label: 'AI Assistant' },
  { value: 'system', label: 'System' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'assistant', label: 'Personal Assistant' },
  { value: 'partner', label: 'Partner' },
] as const;

export function IdentityTab({ config, onChange }: IdentityTabProps) {
  const updateField = <K extends keyof IdentityConfig>(
    field: K,
    value: IdentityConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Identity</CardTitle>
          <CardDescription>
            Define how your agent presents itself visually and conceptually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name and Emoji Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={config.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Foco, Claw, Jarvis"
              />
              <p className="text-xs text-muted-foreground">
                What you&apos;ll call your agent in conversations
              </p>
            </div>

            <div className="space-y-2">
              <Label>Emoji Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => updateField('emoji', emoji)}
                    className={`text-2xl p-2 rounded-lg border transition-all ${
                      config.emoji === emoji
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="agent-tagline">Tagline</Label>
            <Input
              id="agent-tagline"
              value={config.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="e.g., Your AI development partner"
            />
            <p className="text-xs text-muted-foreground">
              A short description that appears in previews
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Style Card */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Style</CardTitle>
          <CardDescription>
            Choose the aesthetic and type of your agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agent-theme">Theme</Label>
              <Select
                value={config.theme}
                onValueChange={(value) => updateField('theme', value as IdentityConfig['theme'])}
              >
                <SelectTrigger id="agent-theme">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Visual aesthetic for UI elements
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-creature">Creature Type</Label>
              <Select
                value={config.creature}
                onValueChange={(value) => updateField('creature', value as IdentityConfig['creature'])}
              >
                <SelectTrigger id="agent-creature">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {CREATURE_OPTIONS.map((creature) => (
                    <SelectItem key={creature.value} value={creature.value}>
                      {creature.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How the agent perceives itself
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
            <div className="text-5xl">{config.emoji}</div>
            <div>
              <h4 className="font-semibold text-lg">{config.name}</h4>
              <p className="text-sm text-muted-foreground">
                {config.tagline || 'Your AI assistant'}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-primary/10 rounded-full">
                  {config.theme}
                </span>
                <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                  {config.creature}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
