import type { ReactNode } from 'react';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>

        {/* Status bar */}
        <StatusBar />
      </div>
    </div>
  );
}
