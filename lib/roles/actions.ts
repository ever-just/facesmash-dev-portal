'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { appUserRoles, developerApps, ActivityType, activityLogs } from '@/lib/db/schema';
import { getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithRole } from '@/lib/auth/middleware';
import { eq, and, desc } from 'drizzle-orm';

// ─── Set End-User Role ──────────────────────────────────────────
const setUserRoleSchema = z.object({
  appId: z.coerce.number(),
  userEmail: z.string().email(),
  role: z.string().min(1).max(50),
});

export const setUserRole = validatedActionWithRole(
  setUserRoleSchema,
  'admin',
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: 'You must be part of a team.' };
    }

    // Verify the app belongs to this team
    const [app] = await db
      .select()
      .from(developerApps)
      .where(
        and(
          eq(developerApps.id, data.appId),
          eq(developerApps.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    if (!app) {
      return { error: 'Application not found.' };
    }

    // Upsert: check if role assignment exists
    const existing = await db
      .select()
      .from(appUserRoles)
      .where(
        and(
          eq(appUserRoles.appId, data.appId),
          eq(appUserRoles.userEmail, data.userEmail)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(appUserRoles)
        .set({ role: data.role, updatedAt: new Date() })
        .where(eq(appUserRoles.id, existing[0].id));
    } else {
      await db.insert(appUserRoles).values({
        appId: data.appId,
        userEmail: data.userEmail,
        role: data.role,
      });
    }

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: ActivityType.UPDATE_USER_ROLE,
    });

    return { success: `Role updated to "${data.role}" for ${data.userEmail}.` };
  }
);

// ─── List Roles for an App ──────────────────────────────────────
export async function listAppUserRoles(appId: number) {
  return db
    .select()
    .from(appUserRoles)
    .where(eq(appUserRoles.appId, appId))
    .orderBy(desc(appUserRoles.createdAt));
}

// ─── Get Role for a Specific User in an App ─────────────────────
export async function getAppUserRole(appId: number, userEmail: string) {
  const result = await db
    .select()
    .from(appUserRoles)
    .where(
      and(
        eq(appUserRoles.appId, appId),
        eq(appUserRoles.userEmail, userEmail)
      )
    )
    .limit(1);

  return result[0] || null;
}

// ─── Delete End-User Role ───────────────────────────────────────
const deleteUserRoleSchema = z.object({
  appId: z.coerce.number(),
  userEmail: z.string().email(),
});

export const deleteUserRole = validatedActionWithRole(
  deleteUserRoleSchema,
  'admin',
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: 'You must be part of a team.' };
    }

    const [app] = await db
      .select()
      .from(developerApps)
      .where(
        and(
          eq(developerApps.id, data.appId),
          eq(developerApps.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    if (!app) {
      return { error: 'Application not found.' };
    }

    await db
      .delete(appUserRoles)
      .where(
        and(
          eq(appUserRoles.appId, data.appId),
          eq(appUserRoles.userEmail, data.userEmail)
        )
      );

    return { success: `Role removed for ${data.userEmail}.` };
  }
);
