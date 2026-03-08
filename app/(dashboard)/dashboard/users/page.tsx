'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  UserCheck,
  UserPlus,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  ScanFace,
  Mail,
  CalendarDays,
  LogIn,
  Loader2,
  Shield,
} from 'lucide-react';
import useSWR from 'swr';

const ROLE_OPTIONS = ['user', 'admin', 'moderator'] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  moderator: 'bg-blue-50 text-blue-700 border-blue-200',
  user: 'bg-gray-50 text-gray-700 border-gray-200',
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FaceCardUser {
  id: string;
  name: string;
  email: string;
  appId: string;
  emailVerified: boolean;
  created: string;
  updated: string;
  loginCount: number;
  lastLogin: string | null;
  role?: string;
}

interface UsersResponse {
  users: FaceCardUser[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  stats: {
    total: number;
    activeThisMonth: number;
    newThisMonth: number;
    avgQuality: number;
  };
  error?: string;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const queryParams = new URLSearchParams({
    page: String(page),
    perPage: '20',
    ...(search ? { search } : {}),
  });

  const { data, isLoading, mutate } = useSWR<UsersResponse>(
    `/api/users?${queryParams.toString()}`,
    fetcher
  );

  const stats = data?.stats;
  const users = data?.users || [];
  const pagination = data?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRoleChange = async (userEmail: string, appId: string, newRole: string) => {
    if (!appId) return;
    setUpdatingRole(userEmail);
    try {
      const formData = new FormData();
      formData.append('appId', appId);
      formData.append('userEmail', userEmail);
      formData.append('role', newRole);
      const res = await fetch('/api/users/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, userEmail, role: newRole }),
      });
      if (res.ok) {
        mutate();
      }
    } catch {
      // Non-fatal
    } finally {
      setUpdatingRole(null);
    }
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg lg:text-2xl font-medium">FaceCard Users</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? '—' : stats?.total ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active This Month</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? '—' : stats?.activeThisMonth ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <UserPlus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">New This Month</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? '—' : stats?.newThisMonth ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Quality Score</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? '—' : stats?.avgQuality ? `${(stats.avgQuality * 100).toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanFace className="h-5 w-5 text-emerald-500" />
            Registered FaceCards
            {pagination && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({pagination.totalItems} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading users...
            </div>
          ) : data?.error ? (
            <div className="text-center py-12 text-red-500">
              <p>{data.error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ScanFace className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No FaceCard users yet</p>
              <p className="text-sm mt-1">
                Users will appear here once they register a FaceCard in your application.
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                <div className="col-span-3">User</div>
                <div className="col-span-2">Registered</div>
                <div className="col-span-2">Last Login</div>
                <div className="col-span-1 text-center">Logins</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-center">Role</div>
                <div className="col-span-1 text-center">App</div>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* User info */}
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <ScanFace className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Registered */}
                    <div className="col-span-2 flex items-center text-sm text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 md:hidden lg:inline" />
                      {new Date(user.created).toLocaleDateString()}
                    </div>

                    {/* Last Login */}
                    <div className="col-span-2 flex items-center text-sm text-gray-500">
                      <LogIn className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 md:hidden lg:inline" />
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </div>

                    {/* Login count */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {user.loginCount}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          Unverified
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    <div className="col-span-2 flex items-center justify-center">
                      {updatingRole === user.email ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={user.role || 'user'}
                          onChange={(e) =>
                            handleRoleChange(user.email, user.appId, e.target.value)
                          }
                          disabled={!user.appId}
                          className={`text-xs px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            ROLE_COLORS[user.role || 'user'] || ROLE_COLORS.user
                          }`}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* App ID */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-xs text-gray-400 font-mono truncate max-w-full">
                        {user.appId ? `#${user.appId}` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 pt-4 border-t mt-2">
                  <p className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
