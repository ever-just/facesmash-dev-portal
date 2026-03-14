import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'FaceSmash Developer Portal',
  description: 'Build face authentication into your apps with the FaceSmash API.',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%2310B981" rx="3"/></svg>',
        sizes: '16x16',
        type: 'image/svg+xml',
      },
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%2310B981" rx="6"/></svg>',
        sizes: '32x32',
        type: 'image/svg+xml',
      },
    ],
    apple: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="%2310B981" rx="40"/></svg>',
  }
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

async function safeGetUser() {
  try {
    return await getUser();
  } catch (error) {
    console.error('Failed to fetch user in layout:', error);
    return null;
  }
}

async function safeGetTeamForUser() {
  try {
    return await getTeamForUser();
  } catch (error) {
    console.error('Failed to fetch team in layout:', error);
    return null;
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': safeGetUser(),
              '/api/team': safeGetTeamForUser()
            }
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
