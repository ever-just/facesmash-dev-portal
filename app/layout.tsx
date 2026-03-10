import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'FaceSmash Developer Portal',
  description: 'Build face authentication into your apps with the FaceSmash API.'
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
