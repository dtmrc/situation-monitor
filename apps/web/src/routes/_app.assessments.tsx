import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/assessments')({
  component: AssessmentsPage,
});

function AssessmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground">Strategic and situational assessments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>View and manage your assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No assessments yet</p>
        </CardContent>
      </Card>
    </div>
  );
}
