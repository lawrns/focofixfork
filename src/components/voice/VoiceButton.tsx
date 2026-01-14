'use client';

/**
 * VoiceButton Component
 * Floating voice button for global access throughout the app
 */

import React, { useState } from 'react';
import { Mic, X, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceController } from '@/hooks/useVoiceController';
import { VoiceInput } from './VoiceInput';
import { VoiceConfirmDialog } from './VoiceConfirmDialog';
import { VoiceFeedback } from './VoiceFeedback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VoiceButtonProps {
  onShowHistory?: () => void;
  showHistoryButton?: boolean;
}

export function VoiceButton({ onShowHistory, showHistoryButton = true }: VoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const {
    isRecording,
    isProcessing,
    transcript,
    feedback,
    error,
    command,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    executeCommand,
    hasActiveCommand,
  } = useVoiceController();

  // Show confirmation dialog when command requires confirmation
  React.useEffect(() => {
    if (hasActiveCommand && feedback?.type === 'confirmation') {
      setShowConfirmDialog(true);
    }
  }, [hasActiveCommand, feedback]);

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    if (isRecording) {
      cancelRecording();
    }
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (command?.id) {
      await executeCommand(command.id, 'yes');
      setShowConfirmDialog(false);
    }
  };

  const handleCancel = async () => {
    if (command?.id) {
      await executeCommand(command.id, 'no');
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <TooltipProvider>
        <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-50">
          {/* History Button */}
          {showHistoryButton && onShowHistory && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onShowHistory}
                  className={cn(
                    'w-12 h-12 rounded-full shadow-lg',
                    'bg-background border-2 border-border',
                    'flex items-center justify-center',
                    'hover:scale-110 transition-transform duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  )}
                  aria-label="Show voice command history"
                >
                  <History className="w-5 h-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Command History</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Main Voice Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenDialog}
                className={cn(
                  'w-16 h-16 rounded-full shadow-xl',
                  'bg-gradient-to-br from-blue-500 to-purple-600',
                  'flex items-center justify-center',
                  'hover:scale-110 transition-transform duration-200',
                  'focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300',
                  isRecording && 'animate-pulse'
                )}
                aria-label="Open voice commands"
              >
                <Mic className="w-7 h-7 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-center">
                <p className="font-medium">Voice Commands</p>
                <p className="text-xs text-muted-foreground">Cmd/Ctrl + Shift + V</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Active indicator */}
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
          )}
        </div>
      </TooltipProvider>

      {/* Voice Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Voice Commands</DialogTitle>
              <button
                onClick={handleCloseDialog}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Voice Input */}
            <VoiceInput
              isRecording={isRecording}
              isProcessing={isProcessing}
              audioLevel={audioLevel}
              transcript={transcript}
              error={error}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancel={cancelRecording}
            />

            {/* Feedback Display */}
            {feedback && !showConfirmDialog && (
              <VoiceFeedback feedback={feedback} />
            )}

            {/* Quick Commands Help */}
            {!isRecording && !isProcessing && !transcript && !error && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Try saying:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <span className="font-medium">Create a task</span>
                    <span className="text-muted-foreground"> - Add new tasks</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <span className="font-medium">Show my tasks</span>
                    <span className="text-muted-foreground"> - List your tasks</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <span className="font-medium">Create a project</span>
                    <span className="text-muted-foreground"> - Start new project</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {command?.parsedIntent && (
        <VoiceConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          intent={command.parsedIntent}
          transcript={transcript}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
