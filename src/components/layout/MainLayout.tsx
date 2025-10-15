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
      <div className="flex h-screen font-display gradient-mesh overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto pb-24 sm:pb-20 md:pb-0 outline-none px-8 py-6">
            <div className="outline-none border-none">
              {children}
            </div>
          </main>
        </div>
        <FloatingAIChat />
      </div>
    </ErrorBoundary>
  )
}