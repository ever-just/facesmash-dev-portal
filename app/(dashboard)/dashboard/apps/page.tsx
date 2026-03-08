'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AppWindow, Plus, Globe, Webhook, Trash2, Loader2 } from 'lucide-react';
import { createApp, deleteApp } from '@/lib/apps/actions';
import { ActionState } from '@/lib/auth/middleware';
import useSWR from 'swr';
import type { DeveloperApp } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ApplicationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: apps, mutate } = useSWR<DeveloperApp[]>('/api/apps', fetcher);

  const [createState, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (_prev: ActionState, formData: FormData) => {
      const result = await createApp(_prev, formData);
      if (result && 'success' in result) {
        setShowCreate(false);
        mutate();
      }
      return result;
    },
    {}
  );

  const handleDelete = async (appId: number) => {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    const formData = new FormData();
    formData.append('appId', String(appId));
    await deleteApp({}, formData);
    mutate();
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg lg:text-2xl font-medium">Applications</h1>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New App
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Application</CardTitle>
            <CardDescription>
              Applications group your API keys and track usage separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div>
                <Label htmlFor="app-name" className="mb-2">
                  Application Name
                </Label>
                <Input
                  id="app-name"
                  name="name"
                  placeholder="e.g. My Mobile App"
                  required
                />
              </div>
              <div>
                <Label htmlFor="app-description" className="mb-2">
                  Description
                </Label>
                <Input
                  id="app-description"
                  name="description"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="app-origins" className="mb-2">
                  Allowed Origins (comma-separated)
                </Label>
                <Input
                  id="app-origins"
                  name="allowedOrigins"
                  placeholder="https://myapp.com, https://staging.myapp.com"
                />
              </div>
              <div>
                <Label htmlFor="app-webhook" className="mb-2">
                  Webhook URL (optional)
                </Label>
                <Input
                  id="app-webhook"
                  name="webhookUrl"
                  placeholder="https://myapp.com/webhooks/facesmash"
                  type="url"
                />
              </div>
              {createState?.error && (
                <p className="text-red-500 text-sm">{createState.error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Application'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {apps && apps.length > 0 ? (
          apps.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AppWindow className="h-5 w-5 text-emerald-500" />
                      {app.name}
                    </CardTitle>
                    {app.description && (
                      <CardDescription className="mt-1">{app.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => handleDelete(app.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-gray-500 space-y-2">
                {app.allowedOrigins && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{app.allowedOrigins}</span>
                  </div>
                )}
                {app.webhookUrl && (
                  <div className="flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{app.webhookUrl}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Created {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        ) : null}

        <Card
          className="border-dashed border-2 flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowCreate(true)}
        >
          <div className="text-center text-gray-400">
            <Plus className="h-10 w-10 mx-auto mb-2" />
            <p className="font-medium">
              {apps && apps.length > 0 ? 'Add another app' : 'Create your first app'}
            </p>
            <p className="text-sm mt-1">Group keys and track usage per application</p>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How Applications Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <div className="flex items-start gap-2">
            <AppWindow className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <p>Each application gets its own set of API keys and usage tracking.</p>
          </div>
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <p>Configure allowed origins to restrict which domains can use your keys.</p>
          </div>
          <div className="flex items-start gap-2">
            <Webhook className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <p>Set up webhooks to receive real-time notifications about authentication events.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
