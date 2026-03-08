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
import {
  Users,
  UserPlus,
  Loader2,
  Crown,
  Shield,
  User,
  Trash2,
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { inviteTeamMember, removeTeamMember } from '@/app/(login)/actions';
import { ActionState } from '@/lib/auth/middleware';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TeamData = {
  id: number;
  name: string;
  planName: string | null;
  subscriptionStatus: string | null;
  teamMembers: {
    id: number;
    role: string;
    joinedAt: string;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  }[];
};

type CurrentUser = {
  id: number;
  name: string | null;
  email: string;
  role: string;
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-amber-500" />,
  admin: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  member: <User className="h-3.5 w-3.5 text-gray-400" />,
};

const roleBadgeStyles: Record<string, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function TeamPage() {
  const { data: team, mutate } = useSWR<TeamData>('/api/team', fetcher);
  const { data: currentUser } = useSWR<CurrentUser>('/api/user', fetcher);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Determine current user's role in the team
  const myMembership = team?.teamMembers?.find(
    (m) => m.user.id === currentUser?.id
  );
  const myRole = myMembership?.role || 'member';
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  const [inviteState, inviteAction, isInviting] = useActionState<ActionState, FormData>(
    async (_prev: ActionState, formData: FormData) => {
      const result = await inviteTeamMember(_prev, formData);
      if (result && 'success' in result) {
        setShowInvite(false);
        mutate();
      }
      return result;
    },
    {}
  );

  const handleRemove = async (memberId: number, memberName: string | null) => {
    const name = memberName || 'this member';
    if (!confirm(`Remove ${name} from the team? They will lose access.`)) return;
    const formData = new FormData();
    formData.append('memberId', String(memberId));
    await removeTeamMember({}, formData);
    mutate();
  };

  const copyInviteInfo = (email: string) => {
    const url = `${window.location.origin}/sign-up`;
    navigator.clipboard.writeText(`You've been invited to join ${team?.name} on FaceSmash. Sign up here: ${url}`);
  };

  if (!team) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">{team.name}</p>
        </div>
        {isOwnerOrAdmin && (
          <Button
            onClick={() => setShowInvite(!showInvite)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && isOwnerOrAdmin && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="text-base">Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to add someone to your team. They&apos;ll need to create an account with the same email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteAction} className="space-y-4">
              <div>
                <Label htmlFor="invite-email" className="mb-2">Email Address</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div>
                <Label className="mb-2">Role</Label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setInviteRole('member')}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                      inviteRole === 'member'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-medium">Member</p>
                      <p className="text-xs opacity-70">Can view apps and usage</p>
                    </div>
                  </button>
                  {myRole === 'owner' && (
                    <button
                      type="button"
                      onClick={() => setInviteRole('admin')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                        inviteRole === 'admin'
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Admin</p>
                        <p className="text-xs opacity-70">Can manage apps, keys, and roles</p>
                      </div>
                    </button>
                  )}
                </div>
                <input type="hidden" name="role" value={inviteRole} />
              </div>
              {inviteState?.error && (
                <p className="text-red-500 text-sm">{inviteState.error}</p>
              )}
              {inviteState?.success && (
                <p className="text-emerald-600 text-sm">{inviteState.success}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isInviting}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Members ({team.teamMembers?.length || 0})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {team.teamMembers
              ?.sort((a, b) => {
                const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
                return (order[a.role] ?? 3) - (order[b.role] ?? 3);
              })
              .map((member) => {
                const isMe = member.user.id === currentUser?.id;
                const canRemove =
                  isOwnerOrAdmin &&
                  !isMe &&
                  member.role !== 'owner';

                return (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-600">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.user.name || 'Unnamed'}
                          {isMe && (
                            <span className="text-xs text-gray-400 ml-1.5">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${roleBadgeStyles[member.role] || roleBadgeStyles.member}`}>
                        {roleIcons[member.role] || roleIcons.member}
                        {member.role}
                      </span>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                          onClick={() => handleRemove(member.id, member.user.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${roleBadgeStyles.owner}`}>
                {roleIcons.owner}
                owner
              </span>
              <p className="text-gray-600 pt-0.5">Full access. Can manage billing, team members, apps, API keys, and all settings.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${roleBadgeStyles.admin}`}>
                {roleIcons.admin}
                admin
              </span>
              <p className="text-gray-600 pt-0.5">Can manage apps, API keys, end-user roles, and invite members. Cannot manage billing or delete the team.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${roleBadgeStyles.member}`}>
                {roleIcons.member}
                member
              </span>
              <p className="text-gray-600 pt-0.5">Read-only access. Can view apps, usage, and activity logs.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
