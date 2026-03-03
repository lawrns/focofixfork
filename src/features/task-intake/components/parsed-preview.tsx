'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Edit2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedTaskResult } from '../types';

interface ParsedPreviewProps {
  parsed: Partial<ParsedTaskResult>;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updated: Partial<ParsedTaskResult>) => void;
  onCancel: () => void;
  confidence?: number;
  className?: string;
}

export function ParsedPreview({
  parsed,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  confidence,
  className,
}: ParsedPreviewProps) {
  const [edited, setEdited] = useState(parsed);

  const handleSave = () => {
    onSave(edited);
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-100 text-rose-700 border-rose-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  if (isEditing) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Edit Parsed Fields
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button variant="default" size="sm" className="h-7" onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={edited.title || ''}
              onChange={(e) => setEdited({ ...edited, title: e.target.value })}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <textarea
              value={edited.description || ''}
              onChange={(e) => setEdited({ ...edited, description: e.target.value })}
              className="w-full min-h-[80px] text-sm p-2 rounded-md border resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Priority</Label>
              <select
                value={edited.priority || 'medium'}
                onChange={(e) => setEdited({ ...edited, priority: e.target.value as any })}
                className="w-full text-sm p-2 rounded-md border bg-background"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Estimated Hours</Label>
              <Input
                type="number"
                value={edited.estimated_hours || ''}
                onChange={(e) => setEdited({ ...edited, estimated_hours: parseFloat(e.target.value) || undefined })}
                className="text-sm"
                placeholder="e.g., 4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input
              value={edited.tags?.join(', ') || ''}
              onChange={(e) => setEdited({ ...edited, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="text-sm"
              placeholder="bug, frontend, urgent"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Parsed Fields
            {confidence !== undefined && (
              <Badge variant="secondary" className="text-[10px]">
                {Math.round(confidence * 100)}% confidence
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <p className="text-sm font-medium">{parsed.title || '—'}</p>
        </div>

        {parsed.description && (
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {parsed.description}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {parsed.priority && (
            <Badge 
              variant="outline" 
              className={cn('text-[10px]', priorityColors[parsed.priority])}
            >
              {parsed.priority}
            </Badge>
          )}
          
          {parsed.estimated_hours && (
            <Badge variant="outline" className="text-[10px]">
              ~{parsed.estimated_hours}h
            </Badge>
          )}

          {parsed.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>

        {parsed.project_slug && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Suggested project: {parsed.project_slug}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
