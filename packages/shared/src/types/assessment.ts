import type { BaseEntity } from './common';

export type PMESIIPTDomain =
  | 'political'
  | 'military'
  | 'economic'
  | 'social'
  | 'information'
  | 'infrastructure'
  | 'physical'
  | 'time';

export interface Assessment extends BaseEntity {
  projectId: string;
  name: string;
  summary: string | null;
}

export interface Factor extends BaseEntity {
  assessmentId: string;
  domain: PMESIIPTDomain;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
}
