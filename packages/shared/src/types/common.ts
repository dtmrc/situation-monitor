export type UUID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntity extends Timestamps {
  id: UUID;
}

export type Status = 'draft' | 'active' | 'archived';
