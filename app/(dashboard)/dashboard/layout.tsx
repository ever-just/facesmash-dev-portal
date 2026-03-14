'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, KeyRound, AppWindow, BarChart3, Users, Settings, Menu, X } from 'lucide-react';

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
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const currentPage = navItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + '/')
  )?.label || 'Dashboard';

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
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

      {/* Mobile backdrop — smooth fade animation */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar — improved mobile sheet design */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block fixed lg:relative inset-y-0 left-0 z-40 transform transition-all duration-300 ease-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
          } mt-[57px] lg:mt-0 h-[calc(100dvh-68px-57px)] lg:h-auto flex flex-col`}
        >
          {/* Mobile header inside sidebar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Navigation</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Close sidebar</span>
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href} passHref>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`shadow-none w-full justify-start text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className={`h-4 w-4 mr-3 flex-shrink-0 transition-colors ${
                      isActive ? 'text-emerald-600' : 'text-gray-600'
                    }`} />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-emerald-600" />
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer section on mobile */}
          <div className="lg:hidden border-t border-gray-100 p-3 space-y-2">
            <p className="text-xs text-gray-500 px-2">FaceSmash Dev Portal</p>
            <Link href="/" className="block">
              <button className="w-full px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-left">
                Back to Home
              </button>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white lg:bg-gray-100 p-3 sm:p-4 lg:p-8">
          <div className="w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
