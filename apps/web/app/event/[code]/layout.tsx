import EventGate from './EventGate';

export const dynamic = 'force-dynamic';

export default function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { code: string };
}) {
  return <EventGate code={params.code}>{children}</EventGate>;
}
