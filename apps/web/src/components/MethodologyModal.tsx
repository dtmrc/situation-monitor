import { useState } from 'react';
import { BookOpen, ExternalLink, Layers, Target, Radio, AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MethodologyModalProps {
  trigger?: React.ReactNode;
  className?: string;
}

const frameworks = [
  {
    icon: Layers,
    name: 'PMESII-PT Analysis',
    description: 'Political, Military, Economic, Social, Information, Infrastructure, Physical Environment, and Time',
    detail: 'A comprehensive environmental scanning framework that examines eight interconnected domains to understand the operational environment and identify key factors affecting strategic decisions.',
  },
  {
    icon: Target,
    name: 'Center of Gravity Analysis',
    description: 'Critical Capabilities, Requirements, and Vulnerabilities',
    detail: 'Systematic identification of the source of power that provides moral or physical strength, freedom of action, or will to act. Used to identify decisive points and high-value targets.',
  },
  {
    icon: Radio,
    name: 'Intelligence Collection',
    description: 'Priority Intelligence Requirements and Named Areas of Interest',
    detail: 'Structured approach to identifying information gaps, prioritizing collection efforts, and managing intelligence sources to answer critical questions.',
  },
  {
    icon: AlertTriangle,
    name: 'Indicator & Warning',
    description: 'Tripwires, Thresholds, and Early Warning Systems',
    detail: 'Proactive monitoring of key indicators that signal changes in the environment, enabling early detection of threats and opportunities.',
  },
];

export function MethodologyModal({ trigger, className }: MethodologyModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            className={cn(
              'text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1.5',
              className
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Methodology & Approach
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-primary" />
            Methodology & Approach
          </DialogTitle>
          <DialogDescription>
            The analytical frameworks and doctrinal foundations behind ATLAS
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Overview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Overview
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ATLAS transforms proven strategic assessment methodologies into accessible,
                actionable tools. Our approach draws from military planning doctrine,
                intelligence analysis tradecraft, and structured analytical techniques
                developed over decades of operational use.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These frameworks have been adapted for commercial applications including
                corporate strategy, risk assessment, competitive intelligence, and
                geopolitical analysis—while maintaining the rigor and structure that
                makes them effective.
              </p>
            </div>

            {/* Frameworks */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Core Frameworks
              </h3>
              <div className="grid gap-4">
                {frameworks.map((framework) => {
                  const Icon = framework.icon;
                  return (
                    <div
                      key={framework.name}
                      className="p-4 rounded-lg border border-border bg-card/50 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {framework.name}
                          </h4>
                          <p className="text-xs text-primary/80 font-mono">
                            {framework.description}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {framework.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Influences */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Doctrinal Influences
              </h3>
              <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our methodology is informed by established doctrine and best practices from:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong className="text-foreground">Joint Planning (JP 5-0)</strong> —
                      Operational design and planning processes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong className="text-foreground">Intelligence Preparation</strong> —
                      Systematic environmental analysis techniques
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong className="text-foreground">Structured Analytic Techniques</strong> —
                      Methods to mitigate cognitive bias and improve analysis
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      <strong className="text-foreground">Risk Management Frameworks</strong> —
                      Probability and impact assessment methodologies
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-muted-foreground/70 italic">
              These frameworks are presented for educational and commercial use. Specific
              implementations may be adapted based on organizational needs and use cases.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
