'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserConfig } from '@/lib/openclaw/types';

interface UserTabProps {
  config: UserConfig;
  onChange: (config: UserConfig) => void;
}

export function UserTab({ config, onChange }: UserTabProps) {
  const updateProfile = (field: keyof UserConfig['profile'], value: string) => {
    onChange({
      ...config,
      profile: { ...config.profile, [field]: value },
    });
  };

  const addStackItem = (field: 'proficient' | 'learning' | 'notFamiliar', item: string) => {
    if (item.trim()) {
      onChange({
        ...config,
        technicalStack: {
          ...config.technicalStack,
          [field]: [...config.technicalStack[field], item.trim()],
        },
      });
    }
  };

  const removeStackItem = (field: 'proficient' | 'learning' | 'notFamiliar', index: number) => {
    onChange({
      ...config,
      technicalStack: {
        ...config.technicalStack,
        [field]: config.technicalStack[field].filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Information about you that helps the agent understand your context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={config.profile.name}
                onChange={(e) => updateProfile('name', e.target.value)}
                placeholder="How the agent should address you"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Input
                id="user-role"
                value={config.profile.role}
                onChange={(e) => updateProfile('role', e.target.value)}
                placeholder="e.g., CTO, Developer, Founder"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="user-company">Company (optional)</Label>
              <Input
                id="user-company"
                value={config.profile.company || ''}
                onChange={(e) => updateProfile('company', e.target.value)}
                placeholder="Your company or organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-timezone">Timezone</Label>
              <Input
                id="user-timezone"
                value={config.profile.timezone}
                onChange={(e) => updateProfile('timezone', e.target.value)}
                placeholder="e.g., America/New_York"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working Hours</Label>
            <div className="flex items-center gap-4">
              <Input
                type="time"
                value={config.profile.workingHours.start}
                onChange={(e) =>
                  onChange({
                    ...config,
                    profile: {
                      ...config.profile,
                      workingHours: {
                        ...config.profile.workingHours,
                        start: e.target.value,
                      },
                    },
                  })
                }
                className="w-32"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={config.profile.workingHours.end}
                onChange={(e) =>
                  onChange({
                    ...config,
                    profile: {
                      ...config.profile,
                      workingHours: {
                        ...config.profile.workingHours,
                        end: e.target.value,
                      },
                    },
                  })
                }
                className="w-32"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-contact">Preferred Contact Method</Label>
            <Input
              id="user-contact"
              value={config.profile.preferredContact}
              onChange={(e) => updateProfile('preferredContact', e.target.value)}
              placeholder="e.g., Telegram, Email, Slack"
            />
          </div>
        </CardContent>
      </Card>

      {/* Technical Stack Card */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Stack</CardTitle>
          <CardDescription>
            Technologies you work with so the agent can tailor responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proficient */}
          <div className="space-y-3">
            <Label className="text-emerald-600 dark:text-emerald-400">Proficient In</Label>
            <div className="flex flex-wrap gap-2">
              {config.technicalStack.proficient.map((tech, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  {tech}
                  <button
                    onClick={() => removeStackItem('proficient', index)}
                    className="ml-2 hover:text-emerald-900/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('new-proficient') as HTMLInputElement;
                addStackItem('proficient', input.value);
                input.value = '';
              }}
              className="flex gap-2"
            >
              <Input
                name="new-proficient"
                placeholder="Add technology (e.g., TypeScript)"
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Learning */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-amber-600 dark:text-amber-400">Currently Learning</Label>
            <div className="flex flex-wrap gap-2">
              {config.technicalStack.learning.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-3 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  {tech}
                  <button
                    onClick={() => removeStackItem('learning', index)}
                    className="ml-2 hover:text-amber-900/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('new-learning') as HTMLInputElement;
                addStackItem('learning', input.value);
                input.value = '';
              }}
              className="flex gap-2"
            >
              <Input
                name="new-learning"
                placeholder="Add technology you're learning"
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Not Familiar */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-rose-600 dark:text-rose-400">Not Familiar With</Label>
            <div className="flex flex-wrap gap-2">
              {config.technicalStack.notFamiliar.map((tech, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="px-3 py-1.5 border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                >
                  {tech}
                  <button
                    onClick={() => removeStackItem('notFamiliar', index)}
                    className="ml-2 hover:text-rose-900/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('new-unfamiliar') as HTMLInputElement;
                addStackItem('notFamiliar', input.value);
                input.value = '';
              }}
              className="flex gap-2"
            >
              <Input
                name="new-unfamiliar"
                placeholder="Add technology you don't know"
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
