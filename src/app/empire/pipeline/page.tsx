import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Workflows Redirect',
  description: 'Legacy Empire workflow entrypoint redirected to the canonical workflow surface.',
}

export default function PipelinePage() {
  redirect('/pipeline')
}
