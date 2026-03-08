'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { developerApps, ActivityType, activityLogs } from '@/lib/db/schema';
import { getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { eq, and, desc } from 'drizzle-orm';
import { canCreateApp } from '@/lib/plans/limits';

// ─── Create App ─────────────────────────────────────────────────
const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  allowedOrigins: z.string().max(1000).optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
});

export const createApp = validatedActionWithUser(
  createAppSchema,
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: 'You must be part of a team to create applications.' };
    }

    // Enforce plan limits
    const appLimit = await canCreateApp(userWithTeam.teamId);
    if (!appLimit.allowed) {
      return {
        error: `You've reached the maximum of ${appLimit.max} app${appLimit.max === 1 ? '' : 's'} on the ${appLimit.tier} plan. Upgrade to create more.`,
      };
    }

    const [app] = await db
      .insert(developerApps)
      .values({
        teamId: userWithTeam.teamId,
        name: data.name,
        description: data.description || null,
        allowedOrigins: data.allowedOrigins || null,
        webhookUrl: data.webhookUrl || null,
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: ActivityType.CREATE_APP,
    });

    return { success: 'Application created successfully.', app };
  }
);

// ─── List Apps ──────────────────────────────────────────────────
export async function listApps(teamId: number) {
  return db
    .select()
    .from(developerApps)
    .where(and(eq(developerApps.teamId, teamId), eq(developerApps.status, 'active')))
    .orderBy(desc(developerApps.createdAt));
}

// ─── Delete App ─────────────────────────────────────────────────
const deleteAppSchema = z.object({
  appId: z.coerce.number(),
});

export const deleteApp = validatedActionWithUser(
  deleteAppSchema,
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
      .update(developerApps)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(developerApps.id, data.appId));

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: ActivityType.DELETE_APP,
    });

    return { success: 'Application deleted.' };
  }
);

// ─── Update App ─────────────────────────────────────────────────
const updateAppSchema = z.object({
  appId: z.coerce.number(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  allowedOrigins: z.string().max(1000).optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
});

export const updateApp = validatedActionWithUser(
  updateAppSchema,
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

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.allowedOrigins !== undefined) updates.allowedOrigins = data.allowedOrigins;
    if (data.webhookUrl !== undefined) updates.webhookUrl = data.webhookUrl || null;

    await db
      .update(developerApps)
      .set(updates)
      .where(eq(developerApps.id, data.appId));

    return { success: 'Application updated.' };
  }
);
