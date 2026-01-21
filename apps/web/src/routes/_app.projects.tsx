import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, FolderKanban, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectsApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createMutation.mutate({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary/20 text-primary',
    archived: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your strategic assessment projects</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Create a new strategic assessment project</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Eastern Europe Assessment"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newProjectName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No projects yet. Create your first project to get started.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.projects.map((project) => (
            <Card key={project.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                    <CardTitle className="text-lg hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </Link>
                  <CardDescription>{project.description || 'No description'}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(project.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <Badge className={cn(statusColors[project.status])}>{project.status}</Badge>
                  <span className="text-muted-foreground">
                    Updated {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
