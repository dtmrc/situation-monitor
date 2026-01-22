import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Shield } from 'lucide-react';

import { MethodologyModal } from '@/components/MethodologyModal';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    // If already authenticated, redirect to app
    const token = api.getAccessToken();
    if (token) {
      throw redirect({ to: '/projects' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-semibold text-foreground tracking-tight">ATLAS</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Strategic Assessment
            <br />
            <span className="text-primary">Platform</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Transform complex strategic assessment methodologies into actionable intelligence. Plan.
            Analyze. Decide.
          </p>
        </div>

        <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

        <MethodologyModal />
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
