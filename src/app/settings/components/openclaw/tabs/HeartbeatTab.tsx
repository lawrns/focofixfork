'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HeartbeatConfig, ChecklistItem } from '@/lib/openclaw/types';

interface HeartbeatTabProps {
  config: HeartbeatConfig;
  onChange: (config: HeartbeatConfig) => void;
}

const INTERVAL_OPTIONS = [
  { value: '15m', label: 'Every 15 minutes' },
  { value: '30m', label: 'Every 30 minutes' },
  { value: '1h', label: 'Every hour' },
  { value: '2h', label: 'Every 2 hours' },
  { value: '4h', label: 'Every 4 hours' },
];

const EMOJI_OPTIONS = ['📧', '📅', '🔥', '📊', '🔔', '✅', '📝', '🐛', '🔒', '📈', '🌐', '💡'];

export function HeartbeatTab({ config, onChange }: HeartbeatTabProps) {
  const addChecklistItem = (item: Omit<ChecklistItem, 'id'>) => {
    if (item.task.trim()) {
      onChange({
        ...config,
        checklist: [
          ...config.checklist,
          { ...item, id: `check-${Date.now()}` },
        ],
      });
    }
  };

  const removeChecklistItem = (id: string) => {
    onChange({
      ...config,
      checklist: config.checklist.filter((item) => item.id !== id),
    });
  };

  const toggleChecklistItem = (id: string) => {
    onChange({
      ...config,
      checklist: config.checklist.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Heartbeat Automation</CardTitle>
              <CardDescription>
                Enable proactive monitoring so your agent checks for important items automatically.
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Activity className={`h-8 w-8 ${config.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium">
                {config.enabled ? 'Heartbeat is enabled' : 'Heartbeat is disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {config.enabled
                  ? `Your agent will check for items every ${config.interval}`
                  : 'Your agent will only respond when you message it'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>
                When and how often the heartbeat runs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="heartbeat-interval">Check Interval</Label>
                <Select
                  value={config.interval}
                  onValueChange={(value) => onChange({ ...config, interval: value })}
                >
                  <SelectTrigger id="heartbeat-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Active Hours</Label>
                  <Switch
                    checked={config.activeHours.enabled}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...config,
                        activeHours: { ...config.activeHours, enabled: checked },
                      })
                    }
                  />
                </div>

                {config.activeHours.enabled && (
                  <div className="flex items-center gap-4 pl-4 border-l-2 border-primary/20">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={config.activeHours.start}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          activeHours: { ...config.activeHours, start: e.target.value },
                        })
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={config.activeHours.end}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          activeHours: { ...config.activeHours, end: e.target.value },
                        })
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checklist Card */}
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Checklist</CardTitle>
              <CardDescription>
                Items your agent checks during each heartbeat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {config.checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      item.enabled
                        ? 'bg-background border-border'
                        : 'bg-muted/50 border-transparent opacity-60'
                    }`}
                  >
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`text-xl ${item.enabled ? 'grayscale-0' : 'grayscale'}`}
                    >
                      {item.emoji}
                    </button>
                    <span className={`flex-1 ${!item.enabled ? 'line-through text-muted-foreground' : ''}`}>
                      {item.task}
                    </span>
                    <button
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const emoji = (form.elements.namedItem('emoji') as HTMLSelectElement).value;
                  const task = (form.elements.namedItem('task') as HTMLInputElement).value;
                  const priority = (form.elements.namedItem('priority') as HTMLSelectElement)
                    .value as ChecklistItem['priority'];
                  addChecklistItem({ emoji, task, priority, enabled: true });
                  form.reset();
                }}
                className="flex gap-2 items-end"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Emoji</Label>
                  <Select name="emoji" defaultValue="📋">
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOJI_OPTIONS.map((emoji) => (
                        <SelectItem key={emoji} value={emoji}>
                          {emoji}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Task</Label>
                  <Input
                    name="task"
                    placeholder="e.g., Check inbox for urgent emails"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Response Rules Card */}
          <Card>
            <CardHeader>
              <CardTitle>Response Rules</CardTitle>
              <CardDescription>
                When your agent should notify you vs. stay silent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="silent-condition">Stay Silent When</Label>
                <Input
                  id="silent-condition"
                  value={config.responseRules.silentCondition}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      responseRules: { ...config.responseRules, silentCondition: e.target.value },
                    })
                  }
                  placeholder="e.g., Nothing urgent found"
                />
                <p className="text-xs text-muted-foreground">
                  The agent will reply HEARTBEAT_OK and not disturb you
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-condition">Send Alert When</Label>
                <Input
                  id="alert-condition"
                  value={config.responseRules.alertCondition}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      responseRules: { ...config.responseRules, alertCondition: e.target.value },
                    })
                  }
                  placeholder="e.g., Critical issue detected"
                />
                <p className="text-xs text-muted-foreground">
                  The agent will send an immediate notification
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-interval">Digest Interval</Label>
                <Input
                  id="digest-interval"
                  value={config.responseRules.digestInterval}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      responseRules: { ...config.responseRules, digestInterval: e.target.value },
                    })
                  }
                  placeholder="e.g., 4h"
                />
                <p className="text-xs text-muted-foreground">
                  How often to batch and send non-urgent updates
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
