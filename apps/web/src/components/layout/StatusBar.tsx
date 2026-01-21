import { Activity, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function StatusBar() {
  const [time, setTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Connection status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="flex items-center justify-between h-8 px-4 border-t border-border bg-card/50 text-xs font-mono text-muted-foreground">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={cn('status-indicator', isConnected ? 'active' : 'critical')} />
          <span>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          <span>SYSTEM NOMINAL</span>
        </div>
      </div>

      {/* Center: Active project indicator */}
      <div className="flex items-center gap-1.5">
        <span className="text-primary">●</span>
        <span>NO ACTIVE PROJECT</span>
      </div>

      {/* Right: Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
        <span>
          UTC{time.getTimezoneOffset() > 0 ? '-' : '+'}
          {Math.abs(time.getTimezoneOffset() / 60)}
        </span>
      </div>
    </footer>
  );
}
