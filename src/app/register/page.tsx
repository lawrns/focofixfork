import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/register-form'

function RegisterFormWrapper() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6 sm:p-8 mx-4">
        <RegisterForm />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6 sm:p-8 mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    }>
      <RegisterFormWrapper />
    </Suspense>
  )
}