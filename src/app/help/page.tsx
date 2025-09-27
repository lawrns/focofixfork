import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help & Docs - Foco',
  description: 'Get help and learn about Foco',
}

export default function HelpPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Help & Documentation</h2>
      </div>
      <div className="rounded-lg border p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Help & Documentation Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Comprehensive documentation and help resources will be available here. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
