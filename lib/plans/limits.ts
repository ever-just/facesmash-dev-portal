'use server';

import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, developerApps } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { listApiKeys } from '@/lib/keys/actions';

// ─── Plan Definitions ────────────────────────────────────────────
export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxApps: number;         // max developer applications
  maxApiKeys: number;      // max API keys
  maxAuthsPerMonth: number; // max authentications per month
  maxTeamMembers: number;  // max team members
  webhooks: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  sso: boolean;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxApps: 1,
    maxApiKeys: 2,
    maxAuthsPerMonth: 1_000,
    maxTeamMembers: 1,
    webhooks: false,
    customBranding: false,
    advancedAnalytics: false,
    sso: false,
  },
  pro: {
    maxApps: Infinity,
    maxApiKeys: 25,
    maxAuthsPerMonth: 50_000,
    maxTeamMembers: 10,
    webhooks: true,
    customBranding: true,
    advancedAnalytics: true,
    sso: false,
  },
  enterprise: {
    maxApps: Infinity,
    maxApiKeys: Infinity,
    maxAuthsPerMonth: Infinity,
    maxTeamMembers: Infinity,
    webhooks: true,
    customBranding: true,
    advancedAnalytics: true,
    sso: true,
  },
};

// ─── Resolve team's plan tier from Stripe data ───────────────────
export async function resolveTeamPlan(team: {
  planName: string | null;
  subscriptionStatus: string | null;
}): Promise<PlanTier> {
  // No subscription or cancelled = free
  if (
    !team.planName ||
    !team.subscriptionStatus ||
    team.subscriptionStatus === 'canceled' ||
    team.subscriptionStatus === 'unpaid'
  ) {
    return 'free';
  }

  // Active or trialing subscription — match by name
  const name = team.planName.toLowerCase();
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('pro')) return 'pro';

  return 'free';
}

// ─── Get limits for a plan ───────────────────────────────────────
export async function getPlanLimits(tier: PlanTier): Promise<PlanLimits> {
  return PLAN_LIMITS[tier];
}

// ─── Get a team's current plan + limits ──────────────────────────
export async function getTeamPlanAndLimits(teamId: number) {
  const [team] = await db
    .select({
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return { tier: 'free' as PlanTier, limits: PLAN_LIMITS.free };
  }

  const tier = await resolveTeamPlan(team);
  return { tier, limits: PLAN_LIMITS[tier] };
}

// ─── Check: can team create another app? ─────────────────────────
export async function canCreateApp(teamId: number): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  tier: PlanTier;
}> {
  const { tier, limits } = await getTeamPlanAndLimits(teamId);

  const [result] = await db
    .select({ count: count() })
    .from(developerApps)
    .where(
      and(eq(developerApps.teamId, teamId), eq(developerApps.status, 'active'))
    );

  const current = result?.count ?? 0;

  return {
    allowed: current < limits.maxApps,
    current,
    max: limits.maxApps,
    tier,
  };
}

// ─── Check: can team create another API key? ─────────────────────
export async function canCreateApiKey(teamId: number): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  tier: PlanTier;
}> {
  const { tier, limits } = await getTeamPlanAndLimits(teamId);

  const keys = await listApiKeys(teamId);
  const current = keys.length;

  return {
    allowed: current < limits.maxApiKeys,
    current,
    max: limits.maxApiKeys,
    tier,
  };
}

// ─── Check: can team add another member? ─────────────────────────
export async function canAddTeamMember(teamId: number): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  tier: PlanTier;
}> {
  const { tier, limits } = await getTeamPlanAndLimits(teamId);

  const [result] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const current = result?.count ?? 0;

  return {
    allowed: current < limits.maxTeamMembers,
    current,
    max: limits.maxTeamMembers,
    tier,
  };
}
