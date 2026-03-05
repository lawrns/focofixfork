'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { platformMeta, type SocialPlatform } from '../services/social-config';

interface SocialSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onCreated: () => void;
}

const platforms: { value: SocialPlatform; label: string }[] = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
];

export function SocialSourceDialog({ open, onOpenChange, projectId, onCreated }: SocialSourceDialogProps) {
  const [platform, setPlatform] = useState<SocialPlatform>('twitter');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [pollInterval, setPollInterval] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = platformMeta[platform];

  const handleSubmit = async () => {
    if (!handle.trim()) {
      setError('Handle is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/content-pipeline/social/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          handle: handle.trim(),
          name: name.trim() || undefined,
          poll_interval_minutes: pollInterval,
          project_id: projectId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add channel');
        return;
      }

      // Reset and close
      setPlatform('twitter');
      setHandle('');
      setName('');
      setPollInterval(120);
      onOpenChange(false);
      onCreated();
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Social Channel</DialogTitle>
          <DialogDescription>
            Monitor a social media channel for AI-powered insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Platform */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Handle */}
          <div className="space-y-2">
            <Label>Handle / URL</Label>
            <Input
              placeholder={meta.placeholder}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          {/* Custom name */}
          <div className="space-y-2">
            <Label>
              Name <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              placeholder={`e.g. ${meta.label}: @handle`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Poll interval */}
          <div className="space-y-2">
            <Label>Poll every {pollInterval} minutes</Label>
            <Slider
              min={30}
              max={1440}
              step={30}
              value={[pollInterval]}
              onValueChange={([v]) => setPollInterval(v)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>30 min</span>
              <span>24 hrs</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Add Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
