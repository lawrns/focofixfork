'use client'

import Sidebar from './Sidebar'
import Header from './Header'
import { FloatingAIChat } from '@/components/ai/floating-ai-chat'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen font-display bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24 sm:pb-20 md:pb-0">
        <Header />
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>
      <FloatingAIChat />
    </div>
  )
}