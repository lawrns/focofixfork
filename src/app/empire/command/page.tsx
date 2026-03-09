import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Cockpit Redirect',
  description: 'Legacy command-center entrypoint redirected to the canonical cockpit surface.',
};

export default function CommandCenterPage() {
  redirect('/dashboard?view=dispatch');
}
