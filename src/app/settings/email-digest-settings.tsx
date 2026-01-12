'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type DigestFrequency = 'none' | 'daily' | 'weekly';

interface DigestTime {
  hour: number;
  minute: number;
}

interface ContentSelection {
  overdue: boolean;
  due_today: boolean;
  completed: boolean;
  comments: boolean;
}

interface DigestPreferences {
  frequency: DigestFrequency;
  digest_time: DigestTime;
  digest_day: string;
  content_selection: ContentSelection;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export default function EmailDigestSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [frequency, setFrequency] = useState<DigestFrequency>('none');
  const [digestTime, setDigestTime] = useState<DigestTime>({ hour: 9, minute: 0 });
  const [digestDay, setDigestDay] = useState('monday');
  const [contentSelection, setContentSelection] = useState<ContentSelection>({
    overdue: true,
    due_today: true,
    completed: true,
    comments: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/digest-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digestPreferences: {
            frequency,
            digestTime,
            digestDay,
            contentSelection,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save digest settings');
      }

      toast.success('Email digest settings saved successfully');
    } catch (error) {
      console.error('Error saving digest settings:', error);
      toast.error('Failed to save email digest settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentToggle = (key: keyof ContentSelection) => {
    setContentSelection(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleHourChange = (value: string) => {
    const hour = parseInt(value, 10);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      setDigestTime(prev => ({ ...prev, hour }));
    }
  };

  const handleMinuteChange = (value: string) => {
    const minute = parseInt(value, 10);
    if (!isNaN(minute) && minute >= 0 && minute <= 59) {
      setDigestTime(prev => ({ ...prev, minute }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>
            Customize how and when you receive email digests of your tasks and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label className="text-base">Digest Frequency</Label>
            <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as DigestFrequency)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="freq-none" />
                <Label htmlFor="freq-none" className="font-normal cursor-pointer">
                  None &ndash; Don&apos;t send me digests
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="freq-daily" />
                <Label htmlFor="freq-daily" className="font-normal cursor-pointer">
                  Daily - Send me a digest every day
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="freq-weekly" />
                <Label htmlFor="freq-weekly" className="font-normal cursor-pointer">
                  Weekly - Send me a digest once per week
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Time Selection for Daily/Weekly */}
          {frequency !== 'none' && (
            <>
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="digest-day" className="text-base">Digest Day</Label>
                  <Select value={digestDay} onValueChange={setDigestDay}>
                    <SelectTrigger id="digest-day" aria-label="Day of week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="digest-time" className="text-base">Digest Time</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor="digest-hour" className="text-sm text-zinc-500">Hour</Label>
                    <Input
                      id="digest-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={String(digestTime.hour).padStart(2, '0')}
                      onChange={(e) => handleHourChange(e.target.value)}
                      className="text-center"
                      aria-label="Hour"
                    />
                  </div>
                  <div className="pt-6 text-zinc-500">:</div>
                  <div className="flex-1">
                    <Label htmlFor="digest-minute" className="text-sm text-zinc-500">Minute</Label>
                    <Input
                      id="digest-minute"
                      type="number"
                      min="0"
                      max="59"
                      value={String(digestTime.minute).padStart(2, '0')}
                      onChange={(e) => handleMinuteChange(e.target.value)}
                      className="text-center"
                      aria-label="Minute"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Content Selection */}
          <div className="space-y-3">
            <Label className="text-base">Digest Content</Label>
            <p className="text-sm text-zinc-500">
              Select which items to include in your digest
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="content-overdue"
                  checked={contentSelection.overdue}
                  onCheckedChange={() => handleContentToggle('overdue')}
                />
                <Label htmlFor="content-overdue" className="font-normal cursor-pointer">
                  Overdue tasks
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="content-due-today"
                  checked={contentSelection.due_today}
                  onCheckedChange={() => handleContentToggle('due_today')}
                />
                <Label htmlFor="content-due-today" className="font-normal cursor-pointer">
                  Tasks due today
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="content-completed"
                  checked={contentSelection.completed}
                  onCheckedChange={() => handleContentToggle('completed')}
                />
                <Label htmlFor="content-completed" className="font-normal cursor-pointer">
                  Completed tasks
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="content-comments"
                  checked={contentSelection.comments}
                  onCheckedChange={() => handleContentToggle('comments')}
                />
                <Label htmlFor="content-comments" className="font-normal cursor-pointer">
                  New comments
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Digest Settings'}
      </Button>
    </div>
  );
}
