import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/intel')({
  component: IntelligencePage,
});

function IntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground">Intelligence collection and analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priority Intelligence Requirements</CardTitle>
          <CardDescription>Active PIRs and collection status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No PIRs defined</p>
        </CardContent>
      </Card>
    </div>
  );
}
