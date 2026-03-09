import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Workflow Engine Redirect',
  description: 'Legacy orchestration entrypoint redirected to the canonical workflow surface.',
};

export default function OrchestrationPage() {
  redirect('/pipeline?tab=workflow')
}
