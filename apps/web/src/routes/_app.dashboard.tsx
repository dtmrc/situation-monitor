import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your strategic assessments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-3xl text-primary">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Threats</CardDescription>
            <CardTitle className="text-3xl text-tactical-amber">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open PIRs</CardDescription>
            <CardTitle className="text-3xl text-tactical-blue">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Alerts</CardDescription>
            <CardTitle className="text-3xl text-tactical-red">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    </div>
  );
}
