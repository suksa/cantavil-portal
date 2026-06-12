import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import { getSettings } from '@/lib/admin';
import AdminClient from './AdminClient';
import AdminLoginPanel from './AdminLoginPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await readSession();

  // Unauthenticated → show the admin login form right here so an admin can
  // always reach this surface, even during a service-closed shutdown.
  if (!session) {
    return <AdminLoginPanel />;
  }

  // Authenticated as a non-admin → send them to their normal dashboard.
  if (!session.info.isAdmin) {
    redirect('/dashboard');
  }

  const settings = await getSettings();
  return <AdminClient info={session.info} initialSettings={settings} />;
}
