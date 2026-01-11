import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Foco - Project Management',
  description: 'Modern project management for teams',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
