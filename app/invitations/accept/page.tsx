'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AcceptInvitationForm from './accept-form';

function InvalidInvitation() {
  const router = useRouter();

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Invalid Invitation Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            The invitation link is missing required information. Please check your email and try again.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<InvalidInvitation />}>
      <AcceptInvitationForm />
    </Suspense>
  );
}
