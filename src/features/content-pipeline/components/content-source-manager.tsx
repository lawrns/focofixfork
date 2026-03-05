'use client';

import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeApiError } from '@/lib/utils/normalize-api-error';
import type { ContentSource, ContentSourceType } from '../types';
import { ContentSourceCard } from './content-source-card';

interface ContentSourceManagerProps {
  projectId: string;
  sources: ContentSource[];
  isLoading: boolean;
  onSourcesChange: () => void;
}

const sourceTypes: { value: ContentSourceType; label: string }[] = [
  { value: 'rss', label: 'RSS Feed' },
  { value: 'api', label: 'API Endpoint' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'scrape', label: 'Web Scraper' },
  { value: 'apify', label: 'Apify Actor' },
];

export function ContentSourceManager({
  projectId,
  sources,
  isLoading,
  onSourcesChange,
}: ContentSourceManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ContentSourceType>('rss');
  const [pollInterval, setPollInterval] = useState(60);
  const [headersText, setHeadersText] = useState('{}');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setUrl('');
    setType('rss');
    setPollInterval(60);
    setHeadersText('{}');
    setFormError(null);
    setEditingSource(null);
  }, []);

  const openAddDialog = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((source: ContentSource) => {
    setEditingSource(source);
    setName(source.name);
    setUrl(source.url);
    setType(source.type);
    setPollInterval(source.poll_interval_minutes);
    setHeadersText(JSON.stringify(source.headers, null, 2));
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Parse headers
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(headersText);
      } catch {
        setFormError('Invalid JSON in headers field');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        project_id: projectId,
        name,
        url,
        type,
        poll_interval_minutes: pollInterval,
        headers,
      };

      if (editingSource) {
        // Update existing
        const res = await fetch('/api/content-pipeline/sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingSource.id, ...payload }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(normalizeApiError(error, 'Failed to update source'));
        }
      } else {
        // Create new
        const res = await fetch('/api/content-pipeline/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(normalizeApiError(error, 'Failed to create source'));
        }
      }

      handleCloseDialog();
      onSourcesChange();
    } catch (error) {
      console.error('Error saving source:', error);
      setFormError(normalizeApiError(error, 'Failed to save source'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, status: 'active' | 'paused') => {
    try {
      const res = await fetch('/api/content-pipeline/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(normalizeApiError(error, 'Failed to update source status'));
      }

      onSourcesChange();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert(normalizeApiError(error, 'Failed to update source status'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source? All associated content items will also be deleted.')) {
      return;
    }

    try {
      const res = await fetch(`/api/content-pipeline/sources?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(normalizeApiError(error, 'Failed to delete source'));
      }

      onSourcesChange();
    } catch (error) {
      console.error('Error deleting source:', error);
      alert(normalizeApiError(error, 'Failed to delete source'));
    }
  };

  const handlePoll = async (id: string) => {
    try {
      const source = sources.find((s) => s.id === id);
      const res = source?.type === 'apify'
        ? await fetch('/api/content-pipeline/apify/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: id, wait_for_finish: true }),
          })
        : await fetch(`/api/content-pipeline/poll?source_id=${id}`, {
            method: 'POST',
          });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(normalizeApiError(error, 'Failed to poll source'));
      }

      const data = await res.json();
      alert(`Poll completed: ${data.data?.summary?.totalNew || 0} new items`);
      onSourcesChange();
    } catch (error) {
      console.error('Error polling source:', error);
      alert(normalizeApiError(error, 'Failed to poll source'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Content Sources</h3>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Add Source
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No content sources configured</p>
          <p className="text-xs mt-1">Add an RSS feed or API to start monitoring</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {sources.map((source) => (
              <ContentSourceCard
                key={source.id}
                source={source}
                onToggleStatus={handleToggleStatus}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onPoll={handlePoll}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsDialogOpen(true);
            return;
          }
          handleCloseDialog();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Content Source' : 'Add Content Source'}
            </DialogTitle>
            <DialogDescription>
              Configure a source to monitor for new content
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., TechCrunch RSS"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContentSourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Poll Interval</Label>
                <span className="text-sm text-muted-foreground">{pollInterval} minutes</span>
              </div>
              <Slider
                value={[pollInterval]}
                onValueChange={(v) => setPollInterval(v[0])}
                min={5}
                max={1440}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                How often to check for new content
              </p>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingSource ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
