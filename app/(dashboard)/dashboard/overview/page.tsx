'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  KeyRound,
  AppWindow,
  BarChart3,
  BookOpen,
  ArrowRight,
  Zap,
  Code2,
  ScanFace,
  Users,
  ShieldCheck,
} from 'lucide-react';
import useSWR from 'swr';
import { TeamDataWithMembers, User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OverviewPage() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: usersData } = useSWR('/api/users?page=1&perPage=1', fetcher);
  const { data: faceCardStatus } = useSWR('/api/auth/facecard/register', fetcher);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-lg lg:text-2xl font-medium">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Build face authentication into your apps with the FaceSmash API.
        </p>
      </div>

      {/* FaceCard Setup Prompt */}
      {faceCardStatus && !faceCardStatus.hasCard && !faceCardStatus.error && (
        <Link href="/dashboard/security">
          <Card className="mb-6 border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 transition-colors cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ScanFace className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-emerald-900">Set up your FaceCard</p>
                  <p className="text-sm text-emerald-700/70 mt-0.5">
                    Register your face to sign in without a password. Go to Security Settings to get started.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* FaceCard Linked Badge */}
      {faceCardStatus?.hasCard && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-emerald-800">FaceCard active — you can sign in with your face</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/keys">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                <KeyRound className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-medium text-sm sm:text-base">API Keys</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Create & manage your keys</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/apps">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <AppWindow className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-sm sm:text-base">Applications</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Configure your apps</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/usage">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-sm sm:text-base">Usage</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor API analytics</p>
            </CardContent>
          </Card>
        </Link>

        <a href="https://docs.facesmash.app" target="_blank" rel="noopener noreferrer">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-medium text-sm sm:text-base">Documentation</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Guides & API reference</p>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* FaceCard Users Stat */}
      {usersData?.stats && (
        <Link href="/dashboard/users">
          <Card className="mb-8 hover:border-emerald-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold">{usersData.stats.total}</p>
                    <p className="text-sm text-gray-500">FaceCard Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-400 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="font-medium text-gray-700">{usersData.stats.activeThisMonth}</p>
                    <p className="text-xs">Active this month</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-medium text-gray-700">{usersData.stats.newThisMonth}</p>
                    <p className="text-xs">New this month</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-emerald-600 px-2 sm:px-4">
                    <span className="hidden sm:inline">View All</span>
                    <ArrowRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Docs Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <a href="https://docs.facesmash.app/docs/quickstart" target="_blank" rel="noopener noreferrer">
          <Card className="hover:border-amber-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-medium">Quickstart Guide</h3>
              <p className="text-sm text-gray-500 mt-1">Get face login working in 5 minutes</p>
            </CardContent>
          </Card>
        </a>

        <a href="https://docs.facesmash.app/docs/sdk" target="_blank" rel="noopener noreferrer">
          <Card className="hover:border-purple-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <Code2 className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-medium">SDK Reference</h3>
              <p className="text-sm text-gray-500 mt-1">React components, hooks & vanilla JS</p>
            </CardContent>
          </Card>
        </a>

        <a href="https://docs.facesmash.app/docs/api-reference" target="_blank" rel="noopener noreferrer">
          <Card className="hover:border-teal-300 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
                <BookOpen className="h-5 w-5 text-teal-600" />
              </div>
              <h3 className="font-medium">API Reference</h3>
              <p className="text-sm text-gray-500 mt-1">REST API endpoints & authentication</p>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Getting Started */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            Quick Start
          </CardTitle>
          <CardDescription>Get face authentication working in 3 steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg border overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700">
              1
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">Create an API key</h4>
              <p className="text-sm text-gray-500 mt-0.5">
                Go to <Link href="/dashboard/keys" className="text-emerald-600 hover:underline">API Keys</Link> and generate your first key.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700">
              2
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">Install the SDK</h4>
              <pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-sm mt-2 overflow-x-auto">
                <code>npm install @facesmash/sdk</code>
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700">
              3
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-medium">Make your first API call</h4>
              <div className="mt-2 rounded-lg overflow-hidden">
                <pre className="bg-gray-900 text-gray-100 px-4 py-3 text-sm overflow-x-auto">
                  <code>{`import { FaceSmashClient } from '@facesmash/sdk';

const client = new FaceSmashClient({
  apiKey: 'fsk_your_key_here',
});

const result = await client.detect({ image: base64Image });
console.log(result.detections);`}</code>
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <ScanFace className="h-8 w-8 text-emerald-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {teamData?.planName || 'Free'} Plan
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {teamData?.subscriptionStatus === 'active'
                    ? 'Active subscription'
                    : '1,000 API calls/month included'}
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing" className="flex-shrink-0">
              <Button variant="outline" size="sm">
                {teamData?.planName ? 'Manage' : 'Upgrade'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
