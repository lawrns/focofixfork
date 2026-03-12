import { redirect } from 'next/navigation';

export const metadata = {
  title: 'My Tasks',
  description: 'Your assigned tasks and work items.',
};

export default function MyTasksPage() {
  // Redirect to the canonical my-work page
  redirect('/my-work');
}
