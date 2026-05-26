import DashboardClient from './DashboardClient';
import { readSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const s = await readSession();
  if (!s) redirect('/?reason=auth');
  return <DashboardClient info={s.info} />;
}
