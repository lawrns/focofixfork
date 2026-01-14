import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VoiceProvider } from '@/components/voice';
import { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

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
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <Providers>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <VoiceProvider />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
