'use client'

import Sidebar from './Sidebar'
import Header from './Header'
import { FloatingAIChat } from '@/components/ai/floating-ai-chat'
import { ErrorBoundary } from '@/components/error-boundary'
import { useSessionManager } from '@/lib/hooks/use-session-manager'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  // Initialize session management (timeout + token refresh)
  useSessionManager()

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen font-display bg-gradient-to-b from-neutral-50 to-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto outline-none px-6 py-6">
            <div className="mx-auto max-w-7xl outline-none border-none">
              {children}
            </div>
          </main>
        </div>
        <FloatingAIChat />
      </div>
    </ErrorBoundary>
  )
}
