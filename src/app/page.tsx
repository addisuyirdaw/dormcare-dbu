import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session) redirect('/login');
  if (role === 'STUDENT') redirect('/student');
  if (role === 'STAFF') redirect('/staff');
  if (role === 'ADMIN') redirect('/admin');
  redirect('/login');
}
