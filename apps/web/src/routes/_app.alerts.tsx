import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/alerts')({
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">Tripwire alerts and notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Current alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active alerts</p>
        </CardContent>
      </Card>
    </div>
  );
}
