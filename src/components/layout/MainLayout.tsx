'use client'

import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen font-display bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header />
        {children}
      </main>
    </div>
  )
}