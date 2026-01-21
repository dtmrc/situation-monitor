import { createFileRoute, redirect } from '@tanstack/react-router';

import { api } from '@/lib/api';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redirect to projects if authenticated, otherwise to login
    const token = api.getAccessToken();
    if (token) {
      throw redirect({ to: '/projects' });
    } else {
      throw redirect({ to: '/login' });
    }
  },
});
