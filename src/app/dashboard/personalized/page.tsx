import { redirect } from 'next/navigation'

/**
 * Dashboard Personalized — consolidated into main dashboard.
 * Server-side permanent redirect to avoid client flash.
 */
export default function PersonalizedDashboardPage() {
  redirect('/dashboard')
}
