'use client';

import { useState, useActionState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import {
  AppWindow,
  ArrowLeft,
  Globe,
  Webhook,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  Save,
  X,
  Users,
  Shield,
} from 'lucide-react';
import { updateApp, deleteApp } from '@/lib/apps/actions';
import { ActionState } from '@/lib/auth/middleware';
import useSWR from 'swr';
import type { DeveloperApp, AppUserRole } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const { data: app, mutate, isLoading } = useSWR<DeveloperApp>(
    `/api/apps/${appId}`,
    fetcher
  );
  const { data: rolesData } = useSWR<{ roles: AppUserRole[] }>(
    app ? `/api/users/roles?appId=${appId}` : null,
    fetcher
  );
  const roles = rolesData?.roles;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrigins, setEditOrigins] = useState('');
  const [editWebhook, setEditWebhook] = useState('');

  const [updateState, updateAction, isUpdating] = useActionState<ActionState, FormData>(
    async (_prev: ActionState, formData: FormData) => {
      const result = await updateApp(_prev, formData);
      if (result && 'success' in result) {
        setIsEditing(false);
        mutate();
      }
      return result;
    },
    {}
  );

  const startEditing = () => {
    if (!app) return;
    setEditName(app.name);
    setEditDescription(app.description || '');
    setEditOrigins(app.allowedOrigins || '');
    setEditWebhook(app.webhookUrl || '');
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this application? This action cannot be undone.')) return;
    const formData = new FormData();
    formData.append('appId', appId);
    await deleteApp({}, formData);
    router.push('/dashboard/apps');
  };

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (!app) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="text-center py-16">
          <AppWindow className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Application not found</h2>
          <p className="text-sm text-gray-500 mb-6">This application may have been deleted or you don&apos;t have access.</p>
          <Link href="/dashboard/apps">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/apps">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <AppWindow className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-medium text-gray-900">{app.name}</h1>
              {app.description && (
                <p className="text-sm text-gray-500">{app.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="text-base">Edit Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="appId" value={appId} />
              <div>
                <Label htmlFor="edit-name" className="mb-2">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="mb-2">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="edit-origins" className="mb-2">Allowed Origins (comma-separated)</Label>
                <Input
                  id="edit-origins"
                  name="allowedOrigins"
                  value={editOrigins}
                  onChange={(e) => setEditOrigins(e.target.value)}
                  placeholder="https://myapp.com, https://staging.myapp.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-webhook" className="mb-2">Webhook URL</Label>
                <Input
                  id="edit-webhook"
                  name="webhookUrl"
                  value={editWebhook}
                  onChange={(e) => setEditWebhook(e.target.value)}
                  placeholder="https://myapp.com/webhooks/facesmash"
                  type="url"
                />
              </div>
              {updateState?.error && (
                <p className="text-red-500 text-sm">{updateState.error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Allowed Origins</p>
              {app.allowedOrigins ? (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                  <div className="space-y-1">
                    {app.allowedOrigins.split(',').map((origin, i) => (
                      <span
                        key={i}
                        className="inline-block bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded mr-1"
                      >
                        {origin.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No origins configured (all origins allowed)</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Webhook URL</p>
              {app.webhookUrl ? (
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono truncate">
                    {app.webhookUrl}
                  </code>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No webhook configured</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                app.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <span className={`size-1.5 rounded-full ${app.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {app.status === 'active' ? 'Active' : 'Deleted'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">App ID</p>
              <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono">{app.id}</code>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Created</p>
                <p className="text-sm text-gray-700">
                  {new Date(app.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Last Updated</p>
                <p className="text-sm text-gray-700">
                  {new Date(app.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                End-User Roles
              </CardTitle>
              <CardDescription>
                Roles assigned to end-users of this application.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roles && roles.length > 0 ? (
            <div className="divide-y">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{role.userEmail}</p>
                    <p className="text-xs text-gray-400">
                      Since {new Date(role.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    <Shield className="h-3 w-3" />
                    {role.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No end-user roles assigned yet. Roles can be assigned via the Users page or API.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
