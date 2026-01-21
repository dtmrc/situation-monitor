import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster, toast } from 'sonner';

import { OfflineIndicator } from './components/common/OfflineIndicator';
import { registerServiceWorker, onUpdateAvailable } from './lib/pwa';
import { queryClient } from './lib/queryClient';
import { routeTree } from './routeTree.gen';
import './styles/globals.css';

// Register PWA service worker
void registerServiceWorker();

// Notify user when a new version is available
onUpdateAvailable(() => {
  toast.info('New version available', {
    description: 'Refresh the page to update',
    action: {
      label: 'Refresh',
      onClick: () => window.location.reload(),
    },
    duration: Infinity,
  });
});

// Create router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const [showDevtools, setShowDevtools] = useState(false);

  useEffect(() => {
    // Lazy load devtools in development
    if (import.meta.env.DEV) {
      setShowDevtools(true);
    }
  }, []);

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid #2a2a2a',
              color: '#e5e5e5',
            },
          }}
        />
        <OfflineIndicator />
        {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
