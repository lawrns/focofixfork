import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/layout/page-shell'
import { Home, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Page Not Found',
  description: 'The requested page could not be found.',
}

export default function NotFoundPage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h[60vh] text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-muted-foreground/30">404</h1>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Page not found</h2>
        
        <p className="text-muted-foreground max-w-md mb-8">
          The page you are looking for does not exist or has been moved. 
          Check the URL or navigate back to the dashboard.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <Button asChild variant="default">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
