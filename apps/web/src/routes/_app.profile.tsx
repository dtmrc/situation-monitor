import { createFileRoute } from '@tanstack/react-router';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_app/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">View and manage your profile information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user?.name || 'User'}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Profile editing coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
