import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Sign up — Critter',
  description: 'Compatibility redirect to the canonical Critter account creation flow.',
}

export default function SignupPage() {
  redirect('/register')
}
