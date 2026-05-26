import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import { getSettings } from '@/lib/admin';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await readSession();
  if (!session) redirect('/?reason=auth');
  if (!session.info.isAdmin) redirect('/dashboard');
  const settings = getSettings();
  return <AdminClient info={session.info} initialSettings={settings} />;
}
