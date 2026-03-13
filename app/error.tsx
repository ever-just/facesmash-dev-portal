'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on chunk load failures (stale deploy cache)
    const message = error.message || '';
    const isChunkError =
      message.includes('Loading chunk') ||
      message.includes('Load failed') ||
      message.includes('ChunkLoadError') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module');

    if (isChunkError) {
      // Prevent infinite reload loops
      const reloadKey = 'chunk-error-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 10_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }

    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          An unexpected error occurred. This may be due to a recent update.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Reload page
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
