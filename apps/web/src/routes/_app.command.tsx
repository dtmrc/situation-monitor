import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/command')({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Centralized operational overview</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Situation Overview</CardTitle>
          <CardDescription>Real-time operational status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Command center coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
