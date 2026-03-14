'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Settings,
  Lock,
  Users,
  CreditCard,
  Activity,
  BarChart3,
  Shield,
  Trash2,
  Check,
  Copy,
  Mail,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  LogOut,
  UserPlus,
  UserCog,
  UserMinus,
  KeyRound,
  KeySquare,
  AppWindow,
  ScanFace,
} from 'lucide-react';
import useSWR from 'swr';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';
import { ActionState } from '@/lib/auth/middleware';
import type { TeamDataWithMembers, User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'For testing and prototyping',
    features: ['1,000 API calls/month', '2 applications', '5 API keys', 'Community support', 'Basic analytics'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For production applications',
    features: ['100,000 API calls/month', 'Unlimited applications', 'Unlimited API keys', 'Priority support', 'Advanced analytics', 'Custom integrations'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'For high-scale deployments',
    features: ['Custom API limits', 'Dedicated support', 'SLA guarantee', 'Custom branding', 'Advanced security'],
    highlighted: false,
  },
];

const ACTIVITY_ICON_MAP: Record<string, any> = {
  SIGN_UP: UserPlus,
  SIGN_IN: UserCog,
  SIGN_OUT: LogOut,
  UPDATE_PASSWORD: Lock,
  DELETE_ACCOUNT: UserMinus,
  UPDATE_ACCOUNT: Settings,
  CREATE_TEAM: UserPlus,
  REMOVE_TEAM_MEMBER: UserMinus,
  INVITE_TEAM_MEMBER: Mail,
  ACCEPT_INVITATION: Check,
  CREATE_APP: AppWindow,
  DELETE_APP: Trash2,
  CREATE_API_KEY: KeyRound,
  REVOKE_API_KEY: KeySquare,
  UPDATE_USER_ROLE: Shield,
};

type TabType = 'account' | 'team' | 'billing' | 'activity';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  
  // Fetch data
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: faceCardStatus } = useSWR('/api/auth/facecard/register', fetcher);

  // Form states
  const [passwordState, passwordAction, isPasswordPending] = useActionState<ActionState, FormData>(updatePassword, { error: '' });
  const [deleteState, deleteAction, isDeletePending] = useActionState<ActionState, FormData>(deleteAccount, { error: '' });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: activityLogsData } = useSWR<any[]>('/api/activity', fetcher);
  const activityLogs = activityLogsData ?? [];

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      SIGN_UP: 'You signed up',
      SIGN_IN: 'You signed in',
      SIGN_OUT: 'You signed out',
      UPDATE_PASSWORD: 'You changed your password',
      DELETE_ACCOUNT: 'You deleted your account',
      UPDATE_ACCOUNT: 'You updated your account',
      CREATE_TEAM: 'You created a new team',
      REMOVE_TEAM_MEMBER: 'You removed a team member',
      INVITE_TEAM_MEMBER: 'You invited a team member',
      ACCEPT_INVITATION: 'You accepted an invitation',
      CREATE_APP: 'You created an application',
      DELETE_APP: 'You deleted an application',
      CREATE_API_KEY: 'You created an API key',
      REVOKE_API_KEY: 'You revoked an API key',
      UPDATE_USER_ROLE: 'You updated a user role',
    };
    return actions[action] || 'Unknown action occurred';
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
        activeTab === tab
          ? 'border-emerald-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 mb-6">Manage your account, team, billing, and security</p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8 overflow-x-auto">
        <div className="flex gap-4 min-w-full">
          <TabButton tab="account" label="Account" icon={Settings} />
          <TabButton tab="team" label="Team" icon={Users} />
          <TabButton tab="billing" label="Billing" icon={CreditCard} />
          <TabButton tab="activity" label="Activity" icon={Activity} />
        </div>
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="mb-2">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    defaultValue={user?.name || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-2">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your password and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Change Password</h3>
                <form action={passwordAction} className="space-y-4">
                  <div>
                    <Label htmlFor="current-password" className="mb-2">Current Password</Label>
                    <Input
                      id="current-password"
                      name="currentPassword"
                      type="password"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="mb-2">New Password</Label>
                    <Input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="mb-2">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                    />
                  </div>
                  {passwordState?.error && (
                    <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                      {passwordState.error}
                    </div>
                  )}
                  {passwordState?.success && (
                    <div className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                      Password updated successfully
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={isPasswordPending}
                  >
                    {isPasswordPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </div>

              {/* FaceCard */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-emerald-600" />
                  FaceCard
                </h3>
                {faceCardStatus?.hasCard ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div>
                      <p className="font-medium text-emerald-900">FaceCard Active</p>
                      <p className="text-sm text-emerald-700">You can sign in with your face</p>
                    </div>
                    <Link href="/dashboard/security">
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">FaceCard Not Set Up</p>
                      <p className="text-sm text-gray-600">Register your face for passwordless sign-in</p>
                    </div>
                    <Link href="/dashboard/security">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        Set Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={deleteAction} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Deleting your account is permanent and cannot be undone. All your data will be removed.
                </p>
                <div>
                  <Label htmlFor="delete-password" className="mb-2">Confirm with your password</Label>
                  <Input
                    id="delete-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                  />
                </div>
                {deleteState?.error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                    {deleteState.error}
                  </div>
                )}
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeletePending}
                  className="w-full"
                >
                  {isDeletePending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your team and member roles</CardDescription>
            </CardHeader>
            <CardContent>
              {teamData?.teamMembers && teamData.teamMembers.length > 0 ? (
                <div className="divide-y">
                  {teamData.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.user.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        <Shield className="h-3 w-3" />
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic py-4 text-center">No team members</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Team Name</p>
                <p className="text-sm font-medium text-gray-900">{teamData?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Plan</p>
                <p className="text-sm font-medium text-gray-900">{teamData?.planName || 'Free'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You're on the {teamData?.planName || 'Free'} plan</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Your subscription is active'
                  : 'Upgrade to a paid plan to unlock more features'}
              </p>
              <Link href="/dashboard/billing">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  {teamData?.planName ? 'Manage Subscription' : 'View Plans'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <Card key={plan.name} className={plan.highlighted ? 'border-emerald-300 bg-emerald-50/50' : ''}>
                  <CardHeader>
                    <CardTitle className={plan.highlighted ? 'text-emerald-700' : ''}>
                      {plan.name}
                    </CardTitle>
                    <div className="mt-2">
                      {plan.price !== null ? (
                        <>
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-gray-600">/month</span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-gray-700">Custom pricing</span>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent actions on your account</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <ul className="space-y-4">
                {activityLogs.slice(0, 20).map((log) => {
                  const Icon = ACTIVITY_ICON_MAP[log.action as string] || Settings;
                  return (
                    <li key={log.id} className="flex items-center space-x-4">
                      <div className="bg-emerald-100 rounded-full p-2">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatAction(log.action as string)}
                          {log.ipAddress && ` from IP ${log.ipAddress}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getRelativeTime(new Date(log.timestamp))}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic py-8 text-center">No activity yet</p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
