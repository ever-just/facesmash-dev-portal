import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getUserTeamRole } from '@/lib/db/queries';
import { listApps } from '@/lib/apps/actions';
import { listAppUserRoles, getAppUserRole } from '@/lib/roles/actions';
import { hasMinRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { appUserRoles, developerApps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return NextResponse.json({ roles: [] });
  }

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const userEmail = searchParams.get('userEmail');

  // Verify the app belongs to this team
  const apps = await listApps(userWithTeam.teamId);
  const appIds = apps.map((a) => a.id.toString());

  if (appId && !appIds.includes(appId)) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  // If specific user+app query
  if (appId && userEmail) {
    const role = await getAppUserRole(Number(appId), userEmail);
    return NextResponse.json({ role: role?.role || 'user' });
  }

  // List all roles for a specific app
  if (appId) {
    const roles = await listAppUserRoles(Number(appId));
    return NextResponse.json({ roles });
  }

  // List roles across all team apps
  const allRoles: any[] = [];
  for (const app of apps) {
    const roles = await listAppUserRoles(app.id);
    allRoles.push(...roles.map((r) => ({ ...r, appName: app.name })));
  }

  return NextResponse.json({ roles: allRoles });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check team role — must be admin or owner
  const teamRole = await getUserTeamRole(user.id);
  if (!teamRole || !hasMinRole(teamRole.role, 'admin')) {
    return NextResponse.json(
      { error: 'Requires admin permissions.' },
      { status: 403 }
    );
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return NextResponse.json({ error: 'No team found.' }, { status: 400 });
  }

  const body = await request.json();
  const { appId, userEmail, role } = body;

  if (!appId || !userEmail || !role) {
    return NextResponse.json(
      { error: 'Missing appId, userEmail, or role.' },
      { status: 400 }
    );
  }

  // Verify the app belongs to this team
  const apps = await listApps(userWithTeam.teamId);
  const appIds = apps.map((a) => a.id.toString());
  if (!appIds.includes(String(appId))) {
    return NextResponse.json({ error: 'App not found.' }, { status: 404 });
  }

  // Upsert role
  const existing = await db
    .select()
    .from(appUserRoles)
    .where(
      and(
        eq(appUserRoles.appId, Number(appId)),
        eq(appUserRoles.userEmail, userEmail)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(appUserRoles)
      .set({ role, updatedAt: new Date() })
      .where(eq(appUserRoles.id, existing[0].id));
  } else {
    await db.insert(appUserRoles).values({
      appId: Number(appId),
      userEmail,
      role,
    });
  }

  return NextResponse.json({ success: true, role });
}
