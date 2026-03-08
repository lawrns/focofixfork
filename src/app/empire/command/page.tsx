import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Command Center | Empire OS',
  description: 'Live agent orchestration, decision queue, and system health monitoring',
};

export default function CommandCenterPage() {
  redirect('/dashboard?view=dispatch');
}
