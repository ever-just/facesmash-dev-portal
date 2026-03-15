import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  invitations,
  TeamDataWithMembers,
} from './schema';
import { listApiKeys } from '@/lib/keys/actions';
import { checkFaceCardStatus } from '@/lib/facesmash-api/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import type { UnkeyKeyMeta } from '@/lib/unkey';

const DEVPORTAL_APP_ID = process.env.DEVPORTAL_APP_ID || 'devportal';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getUserTeamRole(userId: number) {
  const result = await db
    .select({
      role: teamMembers.role,
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function getTeamForUser(): Promise<TeamDataWithMembers | null> {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership?.team || !membership.teamId) {
    return null;
  }

  const teamId = membership.teamId;
  const baseTeam = membership.team;

  const [pendingInviteRows, apiKeys, recentActivities] = await Promise.all([
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        invitedAt: invitations.invitedAt,
        invitedById: users.id,
        invitedByName: users.name,
        invitedByEmail: users.email,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.invitedBy, users.id))
      .where(and(eq(invitations.teamId, teamId), eq(invitations.status, 'pending')))
      .orderBy(desc(invitations.invitedAt)),
    listApiKeys(teamId),
    db
      .select({
        userId: activityLogs.userId,
        timestamp: activityLogs.timestamp,
      })
      .from(activityLogs)
      .where(eq(activityLogs.teamId, teamId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(100),
  ]);

  const faceCardStatuses = await Promise.all(
    baseTeam.teamMembers.map(async (member) => {
      try {
        const res = await checkFaceCardStatus(member.user.email, DEVPORTAL_APP_ID);
        return {
          userId: member.userId,
          hasFaceCard: res.ok && !!res.data?.registered && !!res.data?.verified,
        };
      } catch (error) {
        console.error('[facecard] status check failed:', error);
        return { userId: member.userId, hasFaceCard: false };
      }
    })
  );

  const pendingInvitations = pendingInviteRows.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    invitedAt: invite.invitedAt,
    invitedBy: invite.invitedById
      ? {
          id: invite.invitedById,
          name: invite.invitedByName,
          email: invite.invitedByEmail ?? '',
        }
      : null,
  }));

  const apiKeyCounts = new Map<number, number>();
  for (const key of apiKeys) {
    const meta = key.meta as UnkeyKeyMeta | undefined;
    if (meta?.userId) {
      apiKeyCounts.set(meta.userId, (apiKeyCounts.get(meta.userId) ?? 0) + 1);
    }
  }

  const lastActivityMap = new Map<number, string | null>();
  for (const activity of recentActivities) {
    if (!activity.userId || lastActivityMap.has(activity.userId)) {
      continue;
    }
    lastActivityMap.set(
      activity.userId,
      activity.timestamp ? activity.timestamp.toISOString() : null
    );
  }

  const faceCardMap = new Map<number, boolean>();
  for (const status of faceCardStatuses) {
    faceCardMap.set(status.userId, status.hasFaceCard);
  }

  const teamMembersWithInsights = baseTeam.teamMembers.map((member) => ({
    ...member,
    insights: {
      apiKeyCount: apiKeyCounts.get(member.userId) ?? 0,
      lastActivityAt: lastActivityMap.get(member.userId) ?? null,
      hasFaceCard: faceCardMap.get(member.userId) ?? false,
    },
  }));

  const teamData: TeamDataWithMembers = {
    ...baseTeam,
    currentUserRole: (membership.role as 'owner' | 'admin' | 'member') || 'member',
    teamMembers: teamMembersWithInsights,
    pendingInvitations,
  };

  return teamData;
}
