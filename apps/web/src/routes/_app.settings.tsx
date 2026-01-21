import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Configure your account preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings page coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
