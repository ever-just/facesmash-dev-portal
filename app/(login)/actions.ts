'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser,
  validatedActionWithRole
} from '@/lib/auth/middleware';
import { canAddTeamMember } from '@/lib/plans/limits';
import { sendWelcomeEmail, sendTeamInviteEmail, sendPasswordChangedEmail } from '@/lib/email';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
  accountType: z.enum(['personal', 'company']).optional(),
  companyName: z.string().max(200).optional(),
  companyWebsite: z.string().max(500).optional(),
  companySize: z.string().max(50).optional(),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, name, accountType, companyName, companyWebsite, companySize, inviteId } = data;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email,
    passwordHash,
    name: name || null,
    accountType: accountType || 'personal',
    role: 'owner' // Default role, will be overridden if there's an invitation
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      return { error: 'Invalid or expired invitation.', email, password };
    }
  } else {
    // Create a new team if there's no invitation
    const newTeam: NewTeam = {
      name: accountType === 'company' && companyName ? companyName : (name ? `${name}'s Team` : `${email}'s Team`),
      companyName: accountType === 'company' ? (companyName || null) : null,
      companyWebsite: accountType === 'company' ? (companyWebsite || null) : null,
      companySize: accountType === 'company' ? (companySize || null) : null,
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      return {
        error: 'Failed to create team. Please try again.',
        email,
        password
      };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId,
    role: userRole
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser)
  ]);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, createdUser.name || email).catch((err) =>
    console.error('Failed to send welcome email:', err)
  );

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    // Notify user that password was changed
    sendPasswordChangedEmail(user.email).catch((err) =>
      console.error('Failed to send password changed email:', err)
    );

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.coerce.number()
});

export const removeTeamMember = validatedActionWithRole(
  removeTeamMemberSchema,
  'admin',
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    // Prevent removing yourself
    const [targetMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return { error: 'Team member not found' };
    }

    if (targetMember.userId === user.id) {
      return { error: 'You cannot remove yourself from the team' };
    }

    if (targetMember.role === 'owner') {
      return { error: 'Cannot remove the team owner' };
    }

    await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, memberId));

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin', 'owner'])
});

export const inviteTeamMember = validatedActionWithRole(
  inviteTeamMemberSchema,
  'admin',
  async (data, _, user, teamRole) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    // Only owners can invite admins or owners
    if ((role === 'admin' || role === 'owner') && teamRole !== 'owner') {
      return { error: 'Only the team owner can invite admins or owners.' };
    }

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    // Enforce plan limits
    const memberLimit = await canAddTeamMember(userWithTeam.teamId);
    if (!memberLimit.allowed) {
      return {
        error: `You've reached the maximum of ${memberLimit.max} team member${memberLimit.max === 1 ? '' : 's'} on the ${memberLimit.tier} plan. Upgrade to invite more.`,
      };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // Send invitation email
    const [newInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .orderBy(invitations.invitedAt)
      .limit(1);

    const inviteLink = newInvitation
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://developers.facesmash.app'}/invitations/accept?id=${newInvitation.id}&email=${encodeURIComponent(email)}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://developers.facesmash.app'}`;

    const [teamRow] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, userWithTeam.teamId))
      .limit(1);

    sendTeamInviteEmail(
      email,
      user.name || user.email,
      teamRow?.name || 'your team',
      inviteLink,
      role
    ).catch((err) => console.error('Failed to send invite email:', err));

    return { success: 'Invitation sent successfully' };
  }
);

const acceptInvitationSchema = z.object({
  invitationId: z.coerce.number(),
  email: z.string().email('Invalid email address'),
});

export const acceptInvitation = validatedAction(
  acceptInvitationSchema,
  async (data) => {
    const { invitationId, email } = data;

    const user = await getUser();
    if (!user) {
      return {
        error: 'Please sign in before accepting the invitation.',
      };
    }

    // Verify invitation exists and matches request
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      );

    if (!invitation) {
      return {
        error: 'Invitation is invalid, expired, or already accepted.',
      };
    }

    // Prevent accepting invitation with different email
    if (user.email !== email) {
      return {
        error: 'You must use the email address the invitation was sent to.',
      };
    }

    // Prevent duplicate team members
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, invitation.teamId)
        )
      );

    if (existingMember.length > 0) {
      return { error: 'You are already a member of this team.' };
    }

    // Create team member with role from invitation
    const newMember: NewTeamMember = {
      userId: user.id,
      teamId: invitation.teamId,
      role: invitation.role as 'owner' | 'admin' | 'member',
    };

    try {
      await Promise.all([
        db.insert(teamMembers).values(newMember),
        db
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitationId)),
        logActivity(
          invitation.teamId,
          user.id,
          ActivityType.ACCEPT_INVITATION
        ),
      ]);

      revalidatePath('/dashboard/settings');
      return {
        success: true,
        message: 'You have been added to the team!',
      };
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      return { error: 'Failed to accept invitation. Please try again.' };
    }
  }
);
