'use client';

import { Toaster } from 'sonner';

export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        },
        className: 'font-sans',
      }}
      closeButton
      richColors
    />
  );
}
