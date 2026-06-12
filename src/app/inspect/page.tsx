import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import InspectClient from './InspectClient';

export const dynamic = 'force-dynamic';

export default async function InspectPage() {
  const session = await readSession();
  if (!session) redirect('/?reason=auth');
  return <InspectClient info={session.info} />;
}
