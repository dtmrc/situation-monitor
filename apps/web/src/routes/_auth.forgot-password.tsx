import { createFileRoute, Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
          </div>

          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
