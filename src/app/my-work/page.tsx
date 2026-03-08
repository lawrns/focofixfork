import { redirect } from 'next/navigation';

export default function MyWorkPage() {
  redirect('/dashboard?view=work');
}
