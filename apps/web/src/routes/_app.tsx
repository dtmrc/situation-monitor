import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated
    const token = api.getAccessToken();

    if (!token) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      });
    }

    // Verify token is valid
    try {
      await context.queryClient.ensureQueryData({
        queryKey: ['auth', 'me'],
        queryFn: () => api.get('/auth/me'),
      });
    } catch {
      api.setAccessToken(null);
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
