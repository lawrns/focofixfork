'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);

  const [channels, setChannels] = useState({
    in_app: true,
    email: true,
    push: false,
    slack: false,
  });

  const [enableTelegram, setEnableTelegram] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  const [types, setTypes] = useState({
    mentions: true,
    assigned: true,
    comments: true,
    status: false,
    due_soon: true,
    ai_flags: true,
  });

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHours, setQuietHours] = useState({
    start: '22:00',
    end: '07:00',
  });
  const [quietHoursTimezone, setQuietHoursTimezone] = useState('America/Mexico_City');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications: {
            channels,
            types,
            quietHours,
            enable_telegram: enableTelegram,
            telegram_chat_id: telegramChatId || null,
            quiet_hours_enabled: quietHoursEnabled,
            quiet_hours_start: quietHours.start,
            quiet_hours_end: quietHours.end,
            quiet_hours_timezone: quietHoursTimezone,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }

      toast.success('Notification settings saved successfully');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'in_app', label: 'In-app notifications', description: 'Show in the Inbox', enabled: true },
            { id: 'email', label: 'Email notifications', description: 'Daily digest to your email', enabled: true },
            { id: 'push', label: 'Push notifications', description: 'Browser and mobile push', enabled: false },
            { id: 'slack', label: 'Slack notifications', description: 'Send to connected Slack workspace', enabled: false },
          ].map((channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div>
                <Label className="text-base">{channel.label}</Label>
                <p className="text-sm text-zinc-500">{channel.description}</p>
              </div>
              <Switch
                checked={channels[channel.id as keyof typeof channels]}
                onCheckedChange={(checked) =>
                  setChannels({ ...channels, [channel.id]: checked })
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Telegram notifications</Label>
              <p className="text-sm text-zinc-500">Send alerts via Telegram bot</p>
            </div>
            <Switch
              checked={enableTelegram}
              onCheckedChange={setEnableTelegram}
            />
          </div>
          {enableTelegram && (
            <div className="ml-0 space-y-2 pl-0">
              <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
              <Input
                id="telegram-chat-id"
                placeholder="e.g. 673711346"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Message @jimmyhelpfulbot on Telegram to get your chat ID
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'mentions', label: 'Mentions', enabled: true },
            { id: 'assigned', label: 'Assigned to me', enabled: true },
            { id: 'comments', label: 'Comments on my tasks', enabled: true },
            { id: 'status', label: 'Status changes', enabled: false },
            { id: 'due_soon', label: 'Due date reminders', enabled: true },
            { id: 'ai_flags', label: 'AI flags and suggestions', enabled: true },
          ].map((type) => (
            <div key={type.id} className="flex items-center justify-between">
              <Label>{type.label}</Label>
              <Switch
                checked={types[type.id as keyof typeof types]}
                onCheckedChange={(checked) =>
                  setTypes({ ...types, [type.id]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Mute notifications during your designated do-not-disturb time
              </CardDescription>
            </div>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>
        </CardHeader>
        {quietHoursEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={quietHours.start}
                  onChange={(e) =>
                    setQuietHours({ ...quietHours, start: e.target.value })
                  }
                  aria-label="Quiet hours start time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={quietHours.end}
                  onChange={(e) =>
                    setQuietHours({ ...quietHours, end: e.target.value })
                  }
                  aria-label="Quiet hours end time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-tz">Timezone</Label>
              <Select value={quietHoursTimezone} onValueChange={setQuietHoursTimezone}>
                <SelectTrigger id="quiet-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Mexico_City">America/Mexico_City (CST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                  <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-zinc-500">
              Notifications will be suppressed during these hours. P0 alerts bypass quiet hours.
            </p>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Notification Settings'}
      </Button>
    </div>
  );
}
