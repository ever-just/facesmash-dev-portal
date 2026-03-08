'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useActionState } from 'react';
import { createApiKey, revokeApiKey } from '@/lib/keys/actions';
import useSWR, { mutate } from 'swr';
import { TeamDataWithMembers } from '@/lib/db/schema';

type ActionState = {
  error?: string;
  success?: string;
  key?: string;
  keyId?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function CreateKeyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createApiKey,
    {}
  );
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);

  const copyKey = useCallback(() => {
    if (state.key) {
      navigator.clipboard.writeText(state.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state.key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create API Key
        </CardTitle>
        <CardDescription>
          Generate a new API key for your application. The full key is only shown once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.key ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Save your API key now</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This is the only time the full key will be displayed. Store it securely.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm font-mono break-all">
                {showKey ? state.key : '•'.repeat(state.key.length)}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={copyKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2">
                Key Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Production, Staging, Mobile App"
                required
                maxLength={100}
              />
            </div>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Generate Key
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ApiKeysList() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: keysData, isLoading } = useSWR(
    teamData ? `/api/keys?teamId=${teamData.id}` : null,
    fetcher
  );
  const [revokeState, revokeAction, isRevokePending] = useActionState<
    ActionState,
    FormData
  >(revokeApiKey, {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const keys = keysData?.keys || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Keys</CardTitle>
        <CardDescription>
          {keys.length === 0
            ? 'No API keys yet. Create one above.'
            : `${keys.length} key${keys.length === 1 ? '' : 's'} active`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keys.length > 0 ? (
          <div className="space-y-3">
            {keys.map((key: any) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{key.name || 'Unnamed Key'}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {key.start}...
                      </code>
                      <span>
                        Created{' '}
                        {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <form action={revokeAction}>
                  <input type="hidden" name="keyId" value={key.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isRevokePending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <KeyRound className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No API keys created yet</p>
            <p className="text-sm mt-1">Create your first key above to get started</p>
          </div>
        )}
        {revokeState?.error && (
          <p className="text-red-500 text-sm mt-4">{revokeState.error}</p>
        )}
        {revokeState?.success && (
          <p className="text-green-500 text-sm mt-4">{revokeState.success}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiKeysPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">API Keys</h1>
      <div className="space-y-6">
        <CreateKeyForm />
        <ApiKeysList />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Use your API key in requests to the FaceSmash API:
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST https://api.facesmash.app/v1/face/detect \\
  -H "Authorization: Bearer fsk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"image": "<base64_image>"}'`}
          </pre>
        </CardContent>
      </Card>
    </section>
  );
}
