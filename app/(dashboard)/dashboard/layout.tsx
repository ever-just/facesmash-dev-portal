'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, KeyRound, AppWindow, BarChart3, CreditCard, Settings, Shield, Activity, Menu, Users, UsersRound } from 'lucide-react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: '/dashboard/overview', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/apps', icon: AppWindow, label: 'Applications' },
    { href: '/dashboard/users', icon: Users, label: 'Users' },
    { href: '/dashboard/keys', icon: KeyRound, label: 'API Keys' },
    { href: '/dashboard/usage', icon: BarChart3, label: 'Usage' },
    { href: '/dashboard/team', icon: UsersRound, label: 'Team' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    { href: '/dashboard/general', icon: Settings, label: 'Settings' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { href: '/dashboard/security', icon: Shield, label: 'Security' }
  ];

  const currentPage = navItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + '/')
  )?.label || 'Dashboard';

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center min-w-0">
          <span className="font-medium text-sm truncate">{currentPage}</span>
        </div>
        <Button
          className="-mr-2"
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      {/* Mobile overlay for open sidebar */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 mt-[57px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside
          className={`w-56 sm:w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } mt-[57px] lg:mt-0 h-[calc(100dvh-68px-57px)] lg:h-auto`}
        >
          <nav className="h-full overflow-y-auto p-3 sm:p-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href || pathname.startsWith(item.href + '/') ? 'secondary' : 'ghost'}
                  className={`shadow-none w-full justify-start text-sm ${
                    pathname === item.href || pathname.startsWith(item.href + '/') ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content — overflow-x-hidden prevents child cards/code blocks from bleeding */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white lg:bg-gray-100 p-3 sm:p-4 lg:p-8">
          <div className="w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
