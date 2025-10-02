'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { GoalsService, Goal } from '@/lib/services/goals';
import { toast } from 'sonner';

interface CreateGoalDialogProps {
  children: React.ReactNode;
  onGoalCreated: () => void;
  initialData?: Partial<Goal>;
}

export function CreateGoalDialog({ children, onGoalCreated, initialData }: CreateGoalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Partial<Goal>[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    type: initialData?.type || 'project',
    priority: initialData?.priority || 'medium',
    target_value: initialData?.target_value || '',
    unit: initialData?.unit || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    tags: initialData?.tags || [],
    project_id: initialData?.project_id || '',
    milestone_id: initialData?.milestone_id || '',
  });

  React.useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const data = await GoalsService.getGoalTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.title === templateId);
    if (template) {
      setFormData({
        ...formData,
        title: template.title || '',
        description: template.description || '',
        type: template.type || 'project',
        priority: template.priority || 'medium',
        target_value: template.target_value?.toString() || '',
        unit: template.unit || '',
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const goalData = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type as Goal['type'],
        priority: formData.priority as Goal['priority'],
        status: 'active' as const,
        target_value: formData.target_value ? parseFloat(String(formData.target_value)) : undefined,
        current_value: 0,
        unit: formData.unit || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        project_id: formData.project_id || undefined,
        milestone_id: formData.milestone_id || undefined,
        owner_id: '', // Will be set by the service
      };

      const result = await GoalsService.createGoal(goalData);

      if (result) {
        toast.success('Goal created successfully!');
        setIsOpen(false);
        onGoalCreated();
        // Reset form
        setFormData({
          title: '',
          description: '',
          type: 'project',
          priority: 'medium',
          target_value: '',
          unit: '',
          start_date: '',
          end_date: '',
          tags: [],
          project_id: '',
          milestone_id: '',
        });
        setSelectedTemplate('');
      } else {
        throw new Error('Failed to create goal');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Templates */}
          <div className="space-y-2">
            <Label>Start with a template (optional)</Label>
            <Select value={selectedTemplate} onValueChange={(value) => {
              setSelectedTemplate(value);
              if (value && value !== 'none') applyTemplate(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template, index) => (
                  template.title && <SelectItem key={index} value={template.title}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter goal title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as Goal['type'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              rows={3}
            />
          </div>

          {/* Priority and Target */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as Goal['priority'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="tasks, hours, %"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#0052CC] hover:bg-[#004299]">
              {isLoading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
