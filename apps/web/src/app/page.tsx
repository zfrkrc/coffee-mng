import { headers } from 'next/headers';
import Landing from './landing';

export default async function Page() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  const initialIsWaycoffee = host.includes('waycoffee');
  return <Landing initialIsWaycoffee={initialIsWaycoffee} />;
}
