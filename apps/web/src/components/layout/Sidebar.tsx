import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Shield,
  Target,
  Radio,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Command,
  Building2,
  Network,
  GitCompare,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: Map, label: 'Command Center', href: '/command' },
  { icon: Shield, label: 'Assessments', href: '/assessments' },
  { icon: Target, label: 'Threats', href: '/threats' },
  { icon: Radio, label: 'Intelligence', href: '/intel' },
  { icon: Bell, label: 'Alerts', href: '/alerts' },
];

const strategicDashboards = [
  { icon: Command, label: 'Executive', href: '/dashboards/executive' },
  { icon: Building2, label: 'Political', href: '/dashboards/political' },
  { icon: Network, label: 'Alliances', href: '/dashboards/alliances' },
  { icon: GitCompare, label: 'Scenarios', href: '/dashboards/scenarios' },
  { icon: FileText, label: 'Synthesis', href: '/dashboards/synthesis' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground tracking-tight">ATLAS</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    'hover:bg-secondary',
                    isActive && 'bg-primary/10 text-primary glow-green'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && (
                    <span
                      className={cn(
                        'text-sm',
                        isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover border-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>

          {/* Strategic Dashboards Section */}
          {!collapsed && (
            <div className="mt-4 px-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Strategic Dashboards
              </span>
            </div>
          )}
          <ul className="space-y-1 px-2 mt-2">
            {strategicDashboards.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    'hover:bg-secondary',
                    isActive && 'bg-primary/10 text-primary glow-green'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && (
                    <span
                      className={cn(
                        'text-sm',
                        isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover border-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings & Collapse */}
        <div className="border-t border-border p-2">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            {!collapsed && <span className="text-sm text-muted-foreground">Settings</span>}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
