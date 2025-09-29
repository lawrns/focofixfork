import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6 sm:p-8 mx-4">
        <LoginForm />
      </div>
    </div>
  )
}