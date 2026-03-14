'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { acceptInvitation } from '@/app/(login)/actions';
import type { ActionState } from '@/lib/auth/middleware';

export default function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    acceptInvitation,
    { error: '' }
  );

  const id = searchParams.get('id');
  const email = searchParams.get('email');
  const [showDecline, setShowDecline] = useState(false);

  // Validate params
  if (!id || !email) {
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

  // Success state
  if (state?.success) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Invitation Accepted!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              {state.message || 'You have been successfully added to the team.'}
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

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Invitation
          </CardTitle>
          <CardDescription>You've been invited to join a team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state?.error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Invitation for</p>
            <p className="font-medium text-gray-900">{email}</p>
          </div>

          {!showDecline ? (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="invitationId" value={id} />
              <input type="hidden" name="email" value={email} />

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting Invitation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setShowDecline(true)}
                className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
              >
                Decline
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to decline this invitation?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDecline(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="destructive"
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            This invitation will expire in 7 days
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
