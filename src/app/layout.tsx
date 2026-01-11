import { AppShell } from '@/components/foco/layout/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/contexts/auth-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
      </TooltipProvider>
    </AuthProvider>
  );
}
