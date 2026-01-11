import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <AppShell>{children}</AppShell>
    </TooltipProvider>
  );
}
