import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Critter — Agent Orchestration',
  description: 'Visual orchestration for autonomous agents',
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
      <head>
        <Script id="suppress-extension-errors" strategy="beforeInteractive">
          {`
            (function() {
              const originalError = console.error;
              const originalWarn = console.warn;
              
              const suppressedPatterns = [
                'Unchecked runtime.lastError',
                'Could not establish connection',
                'Receiving end does not exist',
                'The message port closed before a response was received',
                'No tab with id',
                '1password',
                'extension'
              ];

              const shouldSuppress = (args) => {
                const msg = args.map(arg => String(arg)).join(' ');
                return suppressedPatterns.some(pattern => msg.includes(pattern));
              };

              console.error = function(...args) {
                if (shouldSuppress(args)) return;
                originalError.apply(console, args);
              };

              console.warn = function(...args) {
                if (shouldSuppress(args)) return;
                originalWarn.apply(console, args);
              };
              
              window.addEventListener('error', function(event) {
                if (event.message && suppressedPatterns.some(p => event.message.includes(p))) {
                  event.stopImmediatePropagation();
                }
              }, true);

              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && suppressedPatterns.some(p => String(event.reason).includes(p))) {
                  event.stopImmediatePropagation();
                }
              }, true);
            })();
          `}
        </Script>
      </head>
      <body className={GeistSans.className} suppressHydrationWarning>
        <Providers>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
