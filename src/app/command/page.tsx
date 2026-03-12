import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Command Center',
  description: 'Central command interface for agent orchestration.',
};

export default function CommandPage() {
  redirect('/dashboard?view=dispatch');
}
