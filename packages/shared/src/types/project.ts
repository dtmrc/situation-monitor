import type { BaseEntity, Status } from './common';

export interface Project extends BaseEntity {
  name: string;
  description: string | null;
  status: Status;
  ownerId: string;
}
