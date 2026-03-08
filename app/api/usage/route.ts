import { NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { unkey, UNKEY_API_ID } from '@/lib/unkey';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return NextResponse.json({ totalVerifications: 0, dailyData: [], endpointBreakdown: [] });
  }

  try {
    // Query Unkey analytics for verification data
    const result = await unkey.analytics.getVerifications({
      query: `SELECT 
        time,
        SUM(total) as total,
        SUM(success) as success,
        SUM(rateLimited) as rate_limited,
        SUM(usageExceeded) as usage_exceeded
      FROM verifications.key_verifications_per_day_v2
      WHERE api_id = '${UNKEY_API_ID}'
      AND time >= now() - interval 30 day
      GROUP BY time
      ORDER BY time ASC`,
    });

    const rows = result.data || [];

    // Calculate totals
    let totalVerifications = 0;
    let totalSuccess = 0;
    let totalRateLimited = 0;
    const dailyData: { date: string; calls: number; success: number; errors: number }[] = [];

    for (const row of rows as any[]) {
      const total = Number(row.total || 0);
      const success = Number(row.success || 0);
      const rateLimited = Number(row.rate_limited || 0);
      const usageExceeded = Number(row.usage_exceeded || 0);
      totalVerifications += total;
      totalSuccess += success;
      totalRateLimited += rateLimited;

      dailyData.push({
        date: row.time ? new Date(row.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        calls: total,
        success: success,
        errors: rateLimited + usageExceeded,
      });
    }

    return NextResponse.json({
      totalVerifications,
      totalSuccess,
      totalRateLimited,
      successRate: totalVerifications > 0 ? ((totalSuccess / totalVerifications) * 100).toFixed(1) : '100.0',
      dailyData,
    });
  } catch (err: any) {
    console.error('[usage] Failed to fetch analytics:', err?.message || err);
    // Return empty data on error (new accounts won't have analytics data yet)
    return NextResponse.json({
      totalVerifications: 0,
      totalSuccess: 0,
      totalRateLimited: 0,
      successRate: '100.0',
      dailyData: [],
    });
  }
}
