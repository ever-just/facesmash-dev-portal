'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { BarChart3, TrendingUp, Zap, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UsageData {
  totalVerifications: number;
  totalSuccess: number;
  totalRateLimited: number;
  successRate: string;
  dailyData: { date: string; calls: number; success: number; errors: number }[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Icon className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const { data: usage } = useSWR<UsageData>('/api/usage', fetcher, {
    refreshInterval: 30000,
  });

  const totalCalls = usage?.totalVerifications ?? 0;
  const successRate = usage?.successRate ?? '100.0';
  const rateLimited = usage?.totalRateLimited ?? 0;
  const dailyData = usage?.dailyData ?? [];

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Usage Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="API Calls (30 days)"
          value={totalCalls.toLocaleString()}
          subtitle="key verifications"
          icon={Zap}
        />
        <StatCard
          title="Success Rate"
          value={totalCalls > 0 ? `${successRate}%` : '—'}
          subtitle={totalCalls > 0 ? 'of all verifications' : 'No data yet'}
          icon={TrendingUp}
        />
        <StatCard
          title="Rate Limited"
          value={rateLimited.toLocaleString()}
          subtitle="blocked requests"
          icon={ShieldCheck}
        />
        <StatCard
          title="Daily Average"
          value={dailyData.length > 0 ? Math.round(totalCalls / dailyData.length).toLocaleString() : '0'}
          subtitle="calls per day"
          icon={BarChart3}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily API Verifications</CardTitle>
          <CardDescription>Last 30 days — key verification attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="success" name="Success" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="errors" name="Errors" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Usage data will appear once you start verifying API keys.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>Available FaceSmash API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { endpoint: 'POST /v1/face/detect', desc: 'Face detection' },
              { endpoint: 'POST /v1/face/match', desc: 'Face comparison' },
              { endpoint: 'POST /v1/face/register', desc: 'Face registration' },
              { endpoint: 'POST /v1/face/login', desc: 'Face authentication' },
              { endpoint: 'POST /v1/face/analyze', desc: 'Face analysis' },
            ].map((item) => (
              <div key={item.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <code className="text-sm font-mono">{item.endpoint}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
                  Active
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
