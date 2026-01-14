'use client';

/**
 * VoiceConfirmDialog Component
 * Confirmation dialog for voice commands requiring approval
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Intent } from '@/lib/crico/types';

interface VoiceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: Intent | null;
  transcript: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VoiceConfirmDialog({
  open,
  onOpenChange,
  intent,
  transcript,
  onConfirm,
  onCancel,
}: VoiceConfirmDialogProps) {
  if (!intent) return null;

  const riskLevel = getRiskLevel(intent);
  const actionDescription = getActionDescription(intent);
  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start space-x-3">
            <div
              className={cn(
                'p-2 rounded-full',
                riskLevel === 'high' && 'bg-red-100 text-red-600',
                riskLevel === 'medium' && 'bg-yellow-100 text-yellow-600',
                riskLevel === 'low' && 'bg-blue-100 text-blue-600'
              )}
            >
              <RiskIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>Confirm Voice Command</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {actionDescription}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* What you said */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              You said:
            </p>
            <p className="text-sm">{transcript}</p>
          </div>

          {/* Parsed intent details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Command details:
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Domain:</span>
                <span className="font-medium">{intent.domain}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Action:</span>
                <span className="font-medium">{intent.action}</span>
              </div>
              {Object.entries(intent.entities).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Parameters:</p>
                  {Object.entries(intent.entities).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono text-xs">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Risk indicator */}
          <div
            className={cn(
              'p-3 rounded-lg border',
              riskLevel === 'high' && 'bg-red-50 border-red-200',
              riskLevel === 'medium' && 'bg-yellow-50 border-yellow-200',
              riskLevel === 'low' && 'bg-blue-50 border-blue-200'
            )}
          >
            <p className="text-xs font-medium mb-1">
              Risk Level: {riskLevel.toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              {getRiskDescription(riskLevel, intent)}
            </p>
          </div>

          {/* Voice instructions */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground">
              💬 Say <span className="font-semibold">yes</span> to proceed or{' '}
              <span className="font-semibold">cancel</span> to abort
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              riskLevel === 'high' && 'bg-red-600 hover:bg-red-700',
              riskLevel === 'medium' && 'bg-yellow-600 hover:bg-yellow-700'
            )}
          >
            Confirm & Execute
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper functions
function getRiskLevel(intent: Intent): 'low' | 'medium' | 'high' {
  const destructiveActions = ['delete', 'remove', 'drop', 'truncate', 'destroy'];
  const structuralActions = ['add_column', 'drop_column', 'alter_column', 'migrate', 'deploy'];

  if (destructiveActions.includes(intent.action)) {
    return 'high';
  }

  if (structuralActions.includes(intent.action) || intent.domain === 'schema') {
    return 'medium';
  }

  return 'low';
}

function getRiskIcon(riskLevel: string) {
  switch (riskLevel) {
    case 'high':
      return AlertTriangle;
    case 'medium':
      return AlertCircle;
    default:
      return Info;
  }
}

function getActionDescription(intent: Intent): string {
  const descriptions: Record<string, string> = {
    'task.create': 'Create a new task',
    'task.delete': 'Delete a task permanently',
    'task.complete': 'Mark a task as complete',
    'task.update': 'Update task details',
    'project.create': 'Create a new project',
    'project.archive': 'Archive a project',
    'schema.add_column': 'Add a new column to the database',
    'schema.drop_column': 'Remove a column from the database',
    'schema.alter_column': 'Modify a database column',
    'deploy.deploy': 'Deploy changes to staging',
    'deploy.rollback': 'Rollback the last deployment',
    'config.enable': 'Enable a configuration setting',
    'config.disable': 'Disable a configuration setting',
  };

  const key = `${intent.domain}.${intent.action}`;
  const baseDescription = descriptions[key] || `${intent.action} in ${intent.domain}`;

  // Add entity details if available
  const entityDetails = Object.entries(intent.entities)
    .map(([k, v]) => `${k}: "${v}"`)
    .join(', ');

  return entityDetails
    ? `${baseDescription} (${entityDetails})`
    : baseDescription;
}

function getRiskDescription(riskLevel: string, intent: Intent): string {
  switch (riskLevel) {
    case 'high':
      return 'This action is destructive and cannot be easily undone. Please verify the details carefully before proceeding.';
    case 'medium':
      return 'This action will modify your system structure. Make sure this is what you intended.';
    default:
      return 'This is a safe operation that can be undone if needed.';
  }
}
