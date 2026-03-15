import AcceptInvitationForm from './accept-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AcceptInvitationPageProps = {
  searchParams?: {
    id?: string;
    email?: string;
  };
};

export default function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const invitationId = searchParams?.id ?? null;
  const email = searchParams?.email ?? null;

  return <AcceptInvitationForm invitationId={invitationId} email={email} />;
}
