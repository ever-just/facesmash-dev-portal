import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { listApps } from '@/lib/apps/actions';
import { listUsers } from '@/lib/facesmash-api/client';
import { getAppUserRole } from '@/lib/roles/actions';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return NextResponse.json({ users: [], stats: { total: 0, activeThisMonth: 0, newThisMonth: 0, avgQuality: 0 } });
  }

  // Get this team's apps to scope the query
  const apps = await listApps(userWithTeam.teamId);
  const appIds = apps.map((a) => a.id.toString());

  if (appIds.length === 0) {
    return NextResponse.json({ users: [], stats: { total: 0, activeThisMonth: 0, newThisMonth: 0, avgQuality: 0 } });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('perPage') || '20', 10), 100);
  const appIdFilter = searchParams.get('appId');
  const search = searchParams.get('search') || '';

  try {
    // Determine which app IDs to query
    const scopeAppIds = appIdFilter && appIds.includes(appIdFilter) ? [appIdFilter] : appIds;

    // Fetch users from Hono API for each app, then merge results
    const allItems: Array<{
      id: number;
      email: string;
      fullName: string | null;
      emailVerified: boolean;
      loginCount: number;
      successfulLogins: number;
      lastLogin: string | null;
      createdAt: string;
      appId: string;
    }> = [];
    let totalItems = 0;

    for (const scopeAppId of scopeAppIds) {
      const result = await listUsers({
        appId: scopeAppId,
        search,
        page,
        perPage,
      });

      if (result.ok) {
        for (const item of result.data.items) {
          allItems.push({ ...item, appId: scopeAppId });
        }
        totalItems += result.data.totalItems;
      }
    }

    // Get roles for each user
    const userRoles: Record<string, string> = {};
    for (const p of allItems) {
      if (p.appId) {
        try {
          const roleRecord = await getAppUserRole(Number(p.appId), p.email);
          userRoles[p.email] = roleRecord?.role || 'user';
        } catch {
          userRoles[p.email] = 'user';
        }
      }
    }

    const usersWithStats = allItems.map((p) => ({
      id: p.id,
      name: p.fullName || '',
      email: p.email,
      appId: p.appId,
      emailVerified: p.emailVerified || false,
      created: p.createdAt,
      updated: p.createdAt,
      loginCount: p.loginCount || 0,
      lastLogin: p.lastLogin || null,
      role: userRoles[p.email] || 'user',
    }));

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      },
      stats: {
        total: totalItems,
        activeThisMonth: 0,
        newThisMonth: 0,
        avgQuality: 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch FaceCard users:', message);
    return NextResponse.json(
      { error: 'Failed to fetch users from FaceSmash API.' },
      { status: 500 }
    );
  }
}
