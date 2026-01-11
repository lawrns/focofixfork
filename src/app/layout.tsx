import { Providers } from './providers';
import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
      </TooltipProvider>
    </Providers>
  );
}
