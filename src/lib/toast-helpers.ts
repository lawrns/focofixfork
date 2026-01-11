/**
 * Toast Helper Functions
 * Wraps sonner with standardized messages from copy library
 */

import { toast } from 'sonner';
import { toasts } from '@/lib/copy';

// Success toasts
export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showProjectCreated = () => toast.success(toasts.projectCreated);
export const showProjectUpdated = () => toast.success(toasts.projectUpdated);
export const showProjectDeleted = () => toast.success(toasts.projectDeleted);
export const showTaskCreated = () => toast.success(toasts.taskCreated);
export const showTaskUpdated = () => toast.success(toasts.taskUpdated);
export const showTaskCompleted = () => toast.success(toasts.taskCompleted);
export const showChangesSaved = () => toast.success(toasts.changesSaved);
export const showMemberInvited = () => toast.success(toasts.memberInvited);
export const showCopied = () => toast.success(toasts.copied);

// Error toasts
export const showError = (message: string) => {
  toast.error(message);
};

export const showGenericError = () => toast.error(toasts.genericError);
export const showNetworkError = () => toast.error(toasts.networkError);
export const showNotFoundError = () => toast.error(toasts.notFound);
export const showPermissionError = () => toast.error(toasts.permissionDenied);

// Info toasts
export const showInfo = (message: string) => {
  toast.info(message);
};

export const showSyncing = () => toast.loading(toasts.syncing);
export const showLoading = (message?: string) => toast.loading(message || toasts.loading);

// Dismiss loading toast
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

// Promise toast (for async operations)
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, messages);
};

// Toast with undo action
export const showWithUndo = (
  message: string,
  onUndo: () => void,
  duration = 5000
) => {
  toast(message, {
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
    duration,
  });
};

// Specific undo toasts
export const showTaskDeletedWithUndo = (onUndo: () => void) => {
  showWithUndo('Task deleted', onUndo);
};

export const showProjectArchivedWithUndo = (onUndo: () => void) => {
  showWithUndo('Project archived', onUndo);
};

export const showTaskCompletedWithUndo = (onUndo: () => void) => {
  showWithUndo('Task marked done', onUndo);
};
