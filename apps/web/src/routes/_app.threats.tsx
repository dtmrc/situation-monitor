import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/threats')({
  component: ThreatsPage,
});

function ThreatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Threats</h1>
        <p className="text-muted-foreground">Threat assessment and tracking</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Threat Matrix</CardTitle>
          <CardDescription>Active threats and risk levels</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No threats identified</p>
        </CardContent>
      </Card>
    </div>
  );
}
