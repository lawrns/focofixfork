'use client'

import Sidebar from './Sidebar'
import Header from './Header'
import { FloatingAIChat } from '@/components/ai/floating-ai-chat'
import { ErrorBoundary } from '@/components/error-boundary'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen font-display gradient-mesh overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-24 sm:pb-20 md:pb-0 outline-none border-l border-border/50 px-8 py-6">
          <Header />
          <div className="outline-none border-none">
            {children}
          </div>
        </main>
        <FloatingAIChat />
      </div>
    </ErrorBoundary>
  )
}