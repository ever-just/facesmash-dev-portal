import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { listApps } from '@/lib/apps/actions';
import { getPocketBaseAdmin } from '@/lib/pocketbase/client';
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

  // Get this team's apps to scope the PocketBase query
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
    const pb = await getPocketBaseAdmin();

    // Build filter — scope to team's apps
    const scopeAppIds = appIdFilter && appIds.includes(appIdFilter) ? [appIdFilter] : appIds;
    const appFilter = scopeAppIds.map((id) => `app_id="${id}"`).join(' || ');
    let filter = `(${appFilter})`;

    if (search) {
      filter += ` && (email~"${search}" || name~"${search}")`;
    }

    // Fetch user profiles
    const profiles = await pb.collection('user_profiles').getList(page, perPage, {
      filter,
      sort: '-created',
      fields: 'id,name,email,app_id,email_verified,created,updated',
    });

    // Fetch stats — total, active this month, new this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().replace('T', ' ');

    // Total for all apps
    const allProfiles = await pb.collection('user_profiles').getList(1, 1, {
      filter: `(${appFilter})`,
    });
    const total = allProfiles.totalItems;

    // New this month
    const newThisMonth = await pb.collection('user_profiles').getList(1, 1, {
      filter: `(${appFilter}) && created>="${monthStart}"`,
    });

    // Active this month (users with a sign_in_log this month)
    let activeThisMonth = 0;
    try {
      const recentLogins = await pb.collection('sign_in_logs').getList(1, 1, {
        filter: `(${appFilter}) && created>="${monthStart}" && success=true`,
      });
      activeThisMonth = recentLogins.totalItems;
    } catch {
      // sign_in_logs may not have app_id yet
    }

    // Average quality score from face_templates
    let avgQuality = 0;
    try {
      const templates = await pb.collection('face_templates').getFullList({
        filter: `(${appFilter})`,
        fields: 'quality_score',
      });
      if (templates.length > 0) {
        const sum = templates.reduce((acc, t) => acc + (Number(t.quality_score) || 0), 0);
        avgQuality = Math.round((sum / templates.length) * 100) / 100;
      }
    } catch {
      // face_templates may not have app_id yet
    }

    // Get login counts per user (for the current page of users)
    const userEmails = profiles.items.map((p) => p.email);
    const loginCounts: Record<string, number> = {};
    const lastLogins: Record<string, string> = {};

    if (userEmails.length > 0) {
      for (const email of userEmails) {
        try {
          const logs = await pb.collection('sign_in_logs').getList(1, 1, {
            filter: `user_email="${email}" && success=true`,
            sort: '-created',
          });
          loginCounts[email] = logs.totalItems;
          lastLogins[email] = logs.items[0]?.created || '';
        } catch {
          loginCounts[email] = 0;
          lastLogins[email] = '';
        }
      }
    }

    // Get roles for each user
    const userRoles: Record<string, string> = {};
    for (const p of profiles.items) {
      if (p.app_id) {
        try {
          const roleRecord = await getAppUserRole(Number(p.app_id), p.email);
          userRoles[p.email] = roleRecord?.role || 'user';
        } catch {
          userRoles[p.email] = 'user';
        }
      }
    }

    const usersWithStats = profiles.items.map((p) => ({
      id: p.id,
      name: p.name || '',
      email: p.email,
      appId: p.app_id || '',
      emailVerified: p.email_verified || false,
      created: p.created,
      updated: p.updated,
      loginCount: loginCounts[p.email] || 0,
      lastLogin: lastLogins[p.email] || null,
      role: userRoles[p.email] || 'user',
    }));

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page: profiles.page,
        perPage: profiles.perPage,
        totalItems: profiles.totalItems,
        totalPages: profiles.totalPages,
      },
      stats: {
        total,
        activeThisMonth,
        newThisMonth: newThisMonth.totalItems,
        avgQuality,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch FaceCard users:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch users from FaceSmash API.' },
      { status: 500 }
    );
  }
}
