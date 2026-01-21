import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  customType,
} from 'drizzle-orm/pg-core';

import { projects } from './core';

export const ragSchema = pgSchema('rag');

// Custom vector type for pgvector
const vector = customType<{ data: number[]; dpiverName: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value
        .slice(1, -1)
        .split(',')
        .map((v) => parseFloat(v));
    }
    return value as number[];
  },
});

// Documents (source content for RAG)
export const documents = ragSchema.table('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  sourceUrl: text('source_url'),
  sourceType: varchar('source_type', { length: 50 }), // report, article, assessment, etc.
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Document Chunks (for embedding)
export const documentChunks = ragSchema.table(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    startOffset: integer('start_offset'),
    endOffset: integer('end_offset'),
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
    metadata: text('metadata'), // JSON
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    embeddingIndex: index('chunk_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  })
);

// Chat/Query History (for context)
export const queryHistory = ragSchema.table(
  'query_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').notNull(),
    query: text('query').notNull(),
    queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
    response: text('response'),
    relevantChunkIds: text('relevant_chunk_ids'), // JSON array
    model: varchar('model', { length: 50 }),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    queryEmbeddingIndex: index('query_embedding_idx').using(
      'hnsw',
      table.queryEmbedding.op('vector_cosine_ops')
    ),
  })
);

// Relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const queryHistoryRelations = relations(queryHistory, ({ one }) => ({
  project: one(projects, {
    fields: [queryHistory.projectId],
    references: [projects.id],
  }),
}));
