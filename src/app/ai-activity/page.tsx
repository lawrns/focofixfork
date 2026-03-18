import { redirect } from 'next/navigation'

export const metadata = {
  title: 'AI Activity Redirect',
  description: 'Legacy AI activity route redirected to the dashboard activity view.',
}

export default function AIActivityPage() {
  redirect('/dashboard?view=activity')
}
