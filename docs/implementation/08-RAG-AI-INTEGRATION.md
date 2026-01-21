# Phase 8: RAG & AI Integration

## Overview

**Purpose:** Implement Retrieval-Augmented Generation (RAG) using pgvector for document storage and similarity search, integrated with Claude/OpenAI APIs for AI-assisted analysis features.

**Dependencies:** Phase 7 (Geospatial Command Center)

**Parallel Execution:** Can run concurrently with Phase 9 after Phase 7 completes.

**Deliverables:**
- Document ingestion and chunking pipeline
- Embedding generation with OpenAI API
- pgvector similarity search
- Claude API integration for analysis
- AI-assisted features across dashboards
- Context-aware prompting system

---

## Architecture

### RAG Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INGESTION PHASE                                                             │
│  ───────────────                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Document │ -> │  Parse   │ -> │  Chunk   │ -> │  Embed   │              │
│  │  Upload  │    │  & Clean │    │ (512 tok)│    │ (OpenAI) │              │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘              │
│                                                        │                     │
│                                                        ▼                     │
│                                               ┌──────────────┐               │
│                                               │   pgvector   │               │
│                                               │   Storage    │               │
│                                               └──────────────┘               │
│                                                        │                     │
│  RETRIEVAL PHASE                                       │                     │
│  ───────────────                                       │                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐        │                     │
│  │   User   │ -> │  Embed   │ -> │ Similarity│ <──────┘                     │
│  │  Query   │    │  Query   │    │  Search  │                               │
│  └──────────┘    └──────────┘    └────┬─────┘                               │
│                                        │                                     │
│                                        ▼                                     │
│                               ┌────────────────┐                             │
│                               │ Top-K Chunks   │                             │
│                               │ (Relevance)    │                             │
│                               └───────┬────────┘                             │
│                                       │                                      │
│  GENERATION PHASE                     │                                      │
│  ────────────────                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │                    PROMPT TEMPLATE                        │               │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │               │
│  │  │   System    │  │  Retrieved  │  │    User     │       │               │
│  │  │   Prompt    │  │   Context   │  │   Query     │       │               │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │               │
│  └────────────────────────────┬─────────────────────────────┘               │
│                               │                                              │
│                               ▼                                              │
│                       ┌──────────────┐                                       │
│                       │  Claude API  │                                       │
│                       │  (Analysis)  │                                       │
│                       └──────┬───────┘                                       │
│                              │                                               │
│                              ▼                                               │
│                       ┌──────────────┐                                       │
│                       │   Response   │                                       │
│                       │  + Citations │                                       │
│                       └──────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 8.1 | Set up OpenAI embedding client | `rag-pipeline-expert` | Critical | Phase 1 |
| 8.2 | Implement document chunking service | `rag-pipeline-expert` | Critical | 8.1 |
| 8.3 | Create embedding generation pipeline | `rag-pipeline-expert` | Critical | 8.2 |
| 8.4 | Build similarity search queries | `rag-pipeline-expert` | Critical | 8.3 |
| 8.5 | Set up Claude API client | `node-developer` | Critical | Phase 2 |
| 8.6 | Create prompt template system | `intelligence-analysis-expert` | High | 8.5 |
| 8.7 | Build PMESII-PT analysis prompts | `intelligence-analysis-expert` | High | 8.6 |
| 8.8 | Build threat assessment prompts | `intelligence-analysis-expert` | High | 8.6 |
| 8.9 | Build strategic synthesis prompts | `intelligence-analysis-expert` | High | 8.6 |
| 8.10 | Create document upload endpoint | `node-developer` | High | 8.3 |
| 8.11 | Build RAG query endpoint | `node-developer` | High | 8.4, 8.5 |
| 8.12 | Implement streaming responses | `node-developer` | Medium | 8.11 |
| 8.13 | Create AI assistant chat component | `frontend-developer-designer` | High | 8.11 |
| 8.14 | Build analysis suggestion UI | `frontend-developer-designer` | High | 8.11 |
| 8.15 | Add citation/source display | `frontend-developer-designer` | Medium | 8.13 |
| 8.16 | Create BullMQ job for batch embedding | `node-developer` | Medium | 8.3 |
| 8.17 | Build document management UI | `frontend-developer-designer` | Medium | 8.10 |

---

## Detailed Specifications

### 8.1 OpenAI Embedding Client

**File: `apps/api/src/services/embedding.service.ts`**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    encoding_format: 'float',
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
  };
}

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  // Batch requests (max 2048 inputs per request)
  const batchSize = 100;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      encoding_format: 'float',
    });

    response.data.forEach((item, index) => {
      results.push({
        embedding: item.embedding,
        tokens: Math.ceil(response.usage.total_tokens / batch.length),
      });
    });
  }

  return results;
}

export { EMBEDDING_DIMENSIONS };
```

### 8.2 Document Chunking Service

**File: `apps/api/src/services/chunking.service.ts`**
```typescript
interface ChunkOptions {
  maxTokens?: number;
  overlap?: number;
  separator?: string;
}

interface Chunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxTokens: 512,
  overlap: 50,
  separator: '\n\n',
};

// Simple token estimation (1 token ≈ 4 characters for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkDocument(
  content: string,
  options: ChunkOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];

  // Split by separator first
  const paragraphs = content.split(opts.separator);

  let currentChunk = '';
  let currentStart = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    const currentTokens = estimateTokens(currentChunk);

    if (currentTokens + paragraphTokens > opts.maxTokens! && currentChunk) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        startOffset: currentStart,
        endOffset: currentStart + currentChunk.length,
      });

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, opts.overlap!);
      currentChunk = overlapText + opts.separator + paragraph;
      currentStart = currentStart + currentChunk.length - overlapText.length;
    } else {
      if (currentChunk) {
        currentChunk += opts.separator;
      }
      currentChunk += paragraph;
    }
  }

  // Don't forget last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      startOffset: currentStart,
      endOffset: currentStart + currentChunk.length,
    });
  }

  return chunks;
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/);
  const overlapWords = Math.ceil(overlapTokens / 1.5); // ~1.5 tokens per word
  return words.slice(-overlapWords).join(' ');
}

// Specialized chunking for different document types
export function chunkIntelReport(content: string): Chunk[] {
  // Intel reports often have sections - preserve section boundaries
  const sections = content.split(/(?=^#{1,3}\s)/m);

  const chunks: Chunk[] = [];
  let offset = 0;

  sections.forEach((section, index) => {
    if (estimateTokens(section) > 512) {
      // Further chunk large sections
      const subChunks = chunkDocument(section, { maxTokens: 512, overlap: 50 });
      subChunks.forEach((sub) => {
        chunks.push({
          ...sub,
          index: chunks.length,
          startOffset: offset + sub.startOffset,
          endOffset: offset + sub.endOffset,
        });
      });
    } else {
      chunks.push({
        content: section.trim(),
        index: chunks.length,
        startOffset: offset,
        endOffset: offset + section.length,
      });
    }
    offset += section.length;
  });

  return chunks;
}
```

### 8.3 Embedding Pipeline

**File: `apps/api/src/services/rag.service.ts`**
```typescript
import { db } from '../db';
import { documents, documentChunks } from '../db/schema';
import { generateEmbedding, generateEmbeddings } from './embedding.service';
import { chunkDocument, chunkIntelReport } from './chunking.service';
import { eq, sql, cosineDistance } from 'drizzle-orm';

interface IngestDocumentInput {
  projectId: string;
  title: string;
  content: string;
  sourceUrl?: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

export async function ingestDocument(input: IngestDocumentInput): Promise<string> {
  // 1. Store document
  const [doc] = await db.insert(documents).values({
    projectId: input.projectId,
    title: input.title,
    content: input.content,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  }).returning();

  // 2. Chunk document
  const chunks = input.sourceType === 'intel_report'
    ? chunkIntelReport(input.content)
    : chunkDocument(input.content);

  // 3. Generate embeddings for all chunks
  const chunkTexts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(chunkTexts);

  // 4. Store chunks with embeddings
  await db.insert(documentChunks).values(
    chunks.map((chunk, i) => ({
      documentId: doc.id,
      content: chunk.content,
      chunkIndex: chunk.index,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      embedding: embeddings[i].embedding,
      metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null,
    }))
  );

  return doc.id;
}

interface SimilaritySearchInput {
  projectId: string;
  query: string;
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
  sourceUrl?: string;
}

export async function similaritySearch(
  input: SimilaritySearchInput
): Promise<SearchResult[]> {
  const { projectId, query, limit = 5, threshold = 0.7 } = input;

  // 1. Generate query embedding
  const { embedding: queryEmbedding } = await generateEmbedding(query);

  // 2. Search for similar chunks using pgvector
  const results = await db
    .select({
      chunkId: documentChunks.id,
      documentId: documentChunks.documentId,
      documentTitle: documents.title,
      content: documentChunks.content,
      sourceUrl: documents.sourceUrl,
      similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(eq(documents.projectId, projectId))
    .orderBy(sql`${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit);

  // 3. Filter by threshold
  return results.filter((r) => r.similarity >= threshold);
}
```

### 8.5 Claude API Client

**File: `apps/api/src/services/claude.service.ts`**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalysisRequest {
  systemPrompt: string;
  context: string[];
  query: string;
  previousMessages?: ChatMessage[];
  maxTokens?: number;
}

export interface AnalysisResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}

export async function generateAnalysis(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const { systemPrompt, context, query, previousMessages = [], maxTokens = MAX_TOKENS } = request;

  // Build context section
  const contextText = context.length > 0
    ? `\n\n<context>\n${context.join('\n\n---\n\n')}\n</context>\n\n`
    : '';

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...previousMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: `${contextText}${query}`,
    },
  ];

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content.find((c) => c.type === 'text');

  return {
    content: textContent?.text || '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason || 'unknown',
  };
}

// Streaming version for real-time responses
export async function* streamAnalysis(
  request: AnalysisRequest
): AsyncGenerator<string, void, unknown> {
  const { systemPrompt, context, query, previousMessages = [], maxTokens = MAX_TOKENS } = request;

  const contextText = context.length > 0
    ? `\n\n<context>\n${context.join('\n\n---\n\n')}\n</context>\n\n`
    : '';

  const messages: Anthropic.MessageParam[] = [
    ...previousMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: `${contextText}${query}`,
    },
  ];

  const stream = anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
```

### 8.6 Prompt Template System

**File: `apps/api/src/prompts/templates.ts`**
```typescript
export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  requiredVariables: string[];
}

export const promptTemplates: Record<string, PromptTemplate> = {
  pmesii_analysis: {
    name: 'PMESII-PT Domain Analysis',
    systemPrompt: `You are a strategic intelligence analyst specializing in the PMESII-PT framework (Political, Military, Economic, Social, Information, Infrastructure, Physical Environment, Time).

Your task is to analyze the provided context and generate insights for a specific PMESII-PT domain.

Guidelines:
- Be specific and cite evidence from the provided context
- Identify trends (improving, stable, declining)
- Assess confidence levels based on source quality
- Highlight key factors that decision-makers should monitor
- Use structured formatting with clear sections

Output Format:
1. Key Findings (3-5 bullet points)
2. Trend Assessment (with rationale)
3. Confidence Level (Low/Medium/High with explanation)
4. Recommended Indicators to Monitor
5. Information Gaps`,
    userPromptTemplate: `Analyze the {{domain}} domain for the situation described.

Focus Area: {{focus}}

{{additional_guidance}}`,
    requiredVariables: ['domain', 'focus'],
  },

  threat_assessment: {
    name: 'Threat Assessment Analysis',
    systemPrompt: `You are a threat intelligence analyst specializing in threat actor assessment and risk analysis.

Your task is to evaluate threat actors and scenarios using probability-impact methodology.

Guidelines:
- Assess capabilities, intentions, and historical patterns
- Use the 5-point probability scale: Rare, Unlikely, Possible, Likely, Almost Certain
- Use the 5-point impact scale: Negligible, Minor, Moderate, Significant, Catastrophic
- Consider multiple impact categories: casualties, economic, infrastructure, reputation
- Identify potential mitigations

Output Format:
1. Threat Actor Profile Summary
2. Probability Assessment (with reasoning)
3. Impact Assessment by Category
4. Overall Risk Score (Probability × Impact)
5. Key Indicators of Attack Preparation
6. Recommended Mitigations`,
    userPromptTemplate: `Assess the threat posed by: {{threat_actor}}

Scenario: {{scenario}}

Consider the following factors:
{{factors}}`,
    requiredVariables: ['threat_actor', 'scenario'],
  },

  strategic_synthesis: {
    name: 'Strategic Synthesis',
    systemPrompt: `You are a senior strategic analyst responsible for synthesizing multiple intelligence inputs into coherent strategic assessments.

Your task is to integrate findings from PMESII-PT analysis, threat assessments, and intelligence collection into an actionable strategic summary.

Guidelines:
- Synthesize, don't just summarize - identify connections and implications
- Prioritize findings by strategic importance
- Identify key uncertainties and information gaps
- Recommend specific courses of action
- Use clear, concise language suitable for executive audiences

Output Format:
1. Executive Summary (2-3 sentences)
2. Strategic Environment Assessment
3. Key Threats and Opportunities
4. Critical Uncertainties
5. Recommended Actions (prioritized)
6. Intelligence Gaps Requiring Collection`,
    userPromptTemplate: `Synthesize the following inputs into a strategic assessment:

PMESII-PT Summary:
{{pmesii_summary}}

Threat Assessment:
{{threat_summary}}

Intelligence Collection Status:
{{intel_status}}

Focus Question: {{focus_question}}`,
    requiredVariables: ['pmesii_summary', 'threat_summary'],
  },

  cog_analysis: {
    name: 'Center of Gravity Analysis',
    systemPrompt: `You are a military strategist specializing in Center of Gravity (CoG) analysis according to JP 5-0 doctrine.

Your task is to identify and analyze Centers of Gravity, their Critical Capabilities (CC), Critical Requirements (CR), and Critical Vulnerabilities (CV).

Guidelines:
- A CoG is the source of power that provides moral or physical strength
- CCs are what the CoG can do (primary abilities)
- CRs are what the CoG needs to function (essential conditions/resources)
- CVs are CRs that can be attacked/exploited
- Consider both friendly and adversary CoGs

Output Format:
1. Identified Center of Gravity (with rationale)
2. Critical Capabilities (3-5)
3. Critical Requirements (for each CC)
4. Critical Vulnerabilities (exploitable CRs)
5. Recommended Approach (how to leverage CVs)`,
    userPromptTemplate: `Analyze the Center of Gravity for: {{entity}}

Type: {{type}} (Friendly/Adversary/Neutral)

Context:
{{context}}

Focus on identifying exploitable vulnerabilities.`,
    requiredVariables: ['entity', 'type'],
  },

  ach_evaluation: {
    name: 'ACH Hypothesis Evaluation',
    systemPrompt: `You are an intelligence analyst skilled in Analysis of Competing Hypotheses (ACH).

Your task is to evaluate how evidence supports or contradicts various hypotheses.

Guidelines:
- Rate each piece of evidence against each hypothesis using:
  ++ (Strongly supports), + (Supports), N (Neutral), - (Contradicts), -- (Strongly contradicts)
- Focus on disconfirming evidence (more diagnostic than confirming)
- Consider source reliability in your assessments
- Identify which hypotheses are most consistent with the evidence

Output Format:
1. Evidence-Hypothesis Matrix (with ratings)
2. Most Likely Hypothesis (with confidence)
3. Key Diagnostic Evidence
4. Information Gaps (what evidence would distinguish hypotheses)
5. Warning Indicators (what would change the assessment)`,
    userPromptTemplate: `Evaluate the following hypotheses:
{{hypotheses}}

Against this evidence:
{{evidence}}

Consider source reliability ratings provided.`,
    requiredVariables: ['hypotheses', 'evidence'],
  },
};

export function renderPrompt(
  templateName: string,
  variables: Record<string, string>
): { systemPrompt: string; userPrompt: string } {
  const template = promptTemplates[templateName];

  if (!template) {
    throw new Error(`Unknown prompt template: ${templateName}`);
  }

  // Check required variables
  for (const required of template.requiredVariables) {
    if (!variables[required]) {
      throw new Error(`Missing required variable: ${required}`);
    }
  }

  // Render user prompt with variables
  let userPrompt = template.userPromptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
  };
}
```

### 8.11 RAG Query Endpoint

**File: `apps/api/src/routes/ai.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { streamSSE } from 'hono/streaming';

import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { similaritySearch, ingestDocument } from '../services/rag.service';
import { generateAnalysis, streamAnalysis } from '../services/claude.service';
import { renderPrompt, promptTemplates } from '../prompts/templates';
import { db } from '../db';
import { queryHistory } from '../db/schema';
import type { AppEnv } from '../types';

const aiRoutes = new Hono<AppEnv>();

aiRoutes.use('*', authMiddleware);

// Schema
const ragQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  templateName: z.string().optional(),
  variables: z.record(z.string()).optional(),
  includeContext: z.boolean().default(true),
  maxChunks: z.number().min(1).max(20).default(5),
});

const documentUploadSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// RAG Query endpoint
aiRoutes.post('/projects/:projectId/ai/query', validateBody(ragQuerySchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const body = await c.req.json();

  // 1. Search for relevant context
  let contextChunks: string[] = [];
  let relevantChunkIds: string[] = [];

  if (body.includeContext) {
    const searchResults = await similaritySearch({
      projectId,
      query: body.query,
      limit: body.maxChunks,
      threshold: 0.6,
    });

    contextChunks = searchResults.map((r) => r.content);
    relevantChunkIds = searchResults.map((r) => r.chunkId);
  }

  // 2. Render prompt template (if provided)
  let systemPrompt = `You are an AI assistant helping with strategic intelligence analysis.
Answer questions based on the provided context. If the context doesn't contain relevant information, say so.
Always cite specific sources when making claims.`;
  let userPrompt = body.query;

  if (body.templateName) {
    const rendered = renderPrompt(body.templateName, body.variables || {});
    systemPrompt = rendered.systemPrompt;
    userPrompt = rendered.userPrompt + '\n\n' + body.query;
  }

  // 3. Generate response
  const response = await generateAnalysis({
    systemPrompt,
    context: contextChunks,
    query: userPrompt,
  });

  // 4. Log query for analytics
  await db.insert(queryHistory).values({
    projectId,
    userId: user.sub,
    query: body.query,
    response: response.content,
    relevantChunkIds: JSON.stringify(relevantChunkIds),
    model: 'claude-sonnet-4-20250514',
    tokensUsed: response.inputTokens + response.outputTokens,
  });

  return c.json({
    response: response.content,
    sources: relevantChunkIds,
    tokens: {
      input: response.inputTokens,
      output: response.outputTokens,
    },
  });
});

// Streaming RAG Query
aiRoutes.post('/projects/:projectId/ai/stream', validateBody(ragQuerySchema), async (c) => {
  const projectId = c.req.param('projectId');
  const body = await c.req.json();

  // Search context
  let contextChunks: string[] = [];
  if (body.includeContext) {
    const results = await similaritySearch({
      projectId,
      query: body.query,
      limit: body.maxChunks,
    });
    contextChunks = results.map((r) => r.content);
  }

  // Render prompt
  let systemPrompt = 'You are an AI assistant for strategic intelligence analysis.';
  let userPrompt = body.query;

  if (body.templateName) {
    const rendered = renderPrompt(body.templateName, body.variables || {});
    systemPrompt = rendered.systemPrompt;
    userPrompt = rendered.userPrompt + '\n\n' + body.query;
  }

  return streamSSE(c, async (stream) => {
    const generator = streamAnalysis({
      systemPrompt,
      context: contextChunks,
      query: userPrompt,
    });

    for await (const chunk of generator) {
      await stream.writeSSE({ data: chunk });
    }
  });
});

// Document upload endpoint
aiRoutes.post('/projects/:projectId/documents', validateBody(documentUploadSchema), async (c) => {
  const projectId = c.req.param('projectId');
  const body = await c.req.json();

  const documentId = await ingestDocument({
    projectId,
    title: body.title,
    content: body.content,
    sourceUrl: body.sourceUrl,
    sourceType: body.sourceType,
    metadata: body.metadata,
  });

  return c.json({ documentId }, 201);
});

// List available prompt templates
aiRoutes.get('/templates', async (c) => {
  const templates = Object.entries(promptTemplates).map(([key, template]) => ({
    id: key,
    name: template.name,
    requiredVariables: template.requiredVariables,
  }));

  return c.json({ templates });
});

export { aiRoutes };
```

### 8.13 AI Assistant Chat Component

**File: `apps/web/src/features/ai/AiAssistant.tsx`**
```typescript
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Sparkles, Copy, Check } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface AiAssistantProps {
  projectId: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  placeholder?: string;
  className?: string;
}

export function AiAssistant({
  projectId,
  templateName,
  templateVariables,
  placeholder = 'Ask a question...',
  className,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryMutation = useMutation({
    mutationFn: async (query: string) => {
      return api.post<{
        response: string;
        sources: string[];
        tokens: { input: number; output: number };
      }>(`/projects/${projectId}/ai/query`, {
        query,
        templateName,
        variables: templateVariables,
        includeContext: true,
      });
    },
    onSuccess: (data, query) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          sources: data.sources,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    queryMutation.mutate(input);
  };

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Analysis Assistant
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Ask questions about your intelligence data.
                AI will search relevant documents and provide analysis.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col gap-2',
                message.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>

                {message.role === 'assistant' && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    {message.sources && message.sources.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {message.sources.length} sources
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {queryMutation.isPending && (
            <div className="flex items-start">
              <div className="bg-secondary rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="w-2 h-2 bg-primary rounded-full animation-delay-200" />
                    <div className="w-2 h-2 bg-primary rounded-full animation-delay-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <CardContent className="p-4 pt-0 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || queryMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## API Endpoints Summary

### AI Query
```
POST /api/projects/:projectId/ai/query
Body: { query, templateName?, variables?, includeContext?, maxChunks? }
Response: { response, sources, tokens }

POST /api/projects/:projectId/ai/stream
Body: { query, templateName?, variables?, includeContext?, maxChunks? }
Response: SSE stream of text chunks
```

### Documents
```
POST /api/projects/:projectId/documents
Body: { title, content, sourceUrl?, sourceType?, metadata? }
Response: { documentId }

GET /api/projects/:projectId/documents
Response: { documents: Document[] }

DELETE /api/documents/:id
```

### Templates
```
GET /api/ai/templates
Response: { templates: { id, name, requiredVariables }[] }
```

---

## Acceptance Criteria

- [ ] Documents can be uploaded and chunked
- [ ] Embeddings are generated and stored in pgvector
- [ ] Similarity search returns relevant chunks
- [ ] Claude API generates coherent responses
- [ ] Streaming responses work in real-time
- [ ] Prompt templates render correctly
- [ ] AI assistant UI shows messages with sources
- [ ] Analysis suggestions appear in PMESII-PT dashboard
- [ ] Synthesis generation works in Strategic Synthesis dashboard

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/services/embedding.service.ts` | OpenAI embedding client |
| `apps/api/src/services/chunking.service.ts` | Document chunking |
| `apps/api/src/services/rag.service.ts` | RAG pipeline |
| `apps/api/src/services/claude.service.ts` | Claude API client |
| `apps/api/src/prompts/templates.ts` | Prompt templates |
| `apps/api/src/routes/ai.ts` | AI endpoints |
| `apps/web/src/features/ai/AiAssistant.tsx` | Chat component |
| `apps/web/src/features/ai/AnalysisSuggestion.tsx` | Suggestion widget |
| `apps/web/src/features/ai/DocumentUpload.tsx` | Document upload |
| `apps/web/src/hooks/useAiStream.ts` | Streaming hook |

---

## Dependencies

```bash
# API
cd apps/api
pnpm add openai @anthropic-ai/sdk

# Web (for streaming)
cd apps/web
# No additional dependencies needed (uses native EventSource)
```

---

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Multi-Model Embedding Support

Support for multiple embedding providers with configurable selection.

### Embedding Provider Configuration

**File: `apps/api/src/config/embedding.ts`**
```typescript
export type EmbeddingProvider = 'openai' | 'ollama';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  batchSize: number;
}

export const embeddingConfigs: Record<EmbeddingProvider, EmbeddingConfig> = {
  openai: {
    provider: 'openai',
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: 1536, // text-embedding-3-small
    batchSize: 100,
  },
  ollama: {
    provider: 'ollama',
    model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    dimensions: 768, // nomic-embed-text default
    batchSize: 32,
  },
};

export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = (process.env.EMBEDDING_PROVIDER || 'openai') as EmbeddingProvider;
  return embeddingConfigs[provider];
}
```

### Multi-Provider Embedding Service

**File: `apps/api/src/services/embedding.service.ts`** (updated)
```typescript
import OpenAI from 'openai';
import { getEmbeddingConfig, EmbeddingProvider } from '../config/embedding';

interface EmbeddingResult {
  embedding: number[];
  tokenCount?: number;
}

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ollama base URL
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export class EmbeddingService {
  private config = getEmbeddingConfig();

  async embed(text: string): Promise<EmbeddingResult> {
    switch (this.config.provider) {
      case 'openai':
        return this.embedWithOpenAI(text);
      case 'ollama':
        return this.embedWithOllama(text);
      default:
        throw new Error(`Unknown embedding provider: ${this.config.provider}`);
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);

      switch (this.config.provider) {
        case 'openai':
          results.push(...await this.embedBatchOpenAI(batch));
          break;
        case 'ollama':
          // Ollama doesn't support batch, process individually
          for (const text of batch) {
            results.push(await this.embedWithOllama(text));
          }
          break;
      }
    }

    return results;
  }

  private async embedWithOpenAI(text: string): Promise<EmbeddingResult> {
    const response = await openai.embeddings.create({
      model: this.config.model,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      tokenCount: response.usage?.total_tokens,
    };
  }

  private async embedBatchOpenAI(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await openai.embeddings.create({
      model: this.config.model,
      input: texts,
    });

    return response.data.map((item) => ({
      embedding: item.embedding,
    }));
  }

  private async embedWithOllama(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { embedding: data.embedding };
  }

  getDimensions(): number {
    return this.config.dimensions;
  }

  getProvider(): EmbeddingProvider {
    return this.config.provider;
  }
}

export const embeddingService = new EmbeddingService();
```

### Dynamic pgvector Dimensions

Update the schema to support variable embedding dimensions:

**File: `apps/api/src/db/schema/rag.ts`** (updated section)
```typescript
import { getEmbeddingConfig } from '../../config/embedding';

const EMBEDDING_DIMENSIONS = getEmbeddingConfig().dimensions;

// Embeddings table with dynamic dimensions
export const embeddings = ragSchema.table('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id')
    .references(() => chunks.id, { onDelete: 'cascade' })
    .notNull(),
  // Dynamic vector dimension based on provider
  embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  embeddingIdx: index('embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));
```

### Migration for Dimension Changes

If switching between providers with different dimensions, a migration is needed:

**File: `apps/api/src/db/migrations/switch-embedding-provider.sql`**
```sql
-- WARNING: This will delete existing embeddings!
-- Run this when switching embedding providers with different dimensions

-- 1. Drop the old index
DROP INDEX IF EXISTS rag.embedding_idx;

-- 2. Delete old embeddings
TRUNCATE TABLE rag.embeddings CASCADE;

-- 3. Alter column dimension (example: 1536 -> 768 for OpenAI -> Ollama)
ALTER TABLE rag.embeddings
ALTER COLUMN embedding TYPE vector(768);

-- 4. Recreate index
CREATE INDEX embedding_idx ON rag.embeddings
USING hnsw (embedding vector_cosine_ops);

-- 5. Re-embed all documents (run via application code)
```

### LLM Provider Configuration

**File: `apps/api/src/config/llm.ts`**
```typescript
export type LLMProvider = 'anthropic' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const llmConfigs: Record<LLMProvider, LLMConfig> = {
  anthropic: {
    provider: 'anthropic',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: 4096,
    temperature: 0.7,
  },
  openai: {
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as LLMProvider;
  return llmConfigs[provider];
}
```

### Multi-Provider LLM Service

**File: `apps/api/src/services/llm.service.ts`**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { getLLMConfig, LLMProvider } from '../config/llm';

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class LLMService {
  private config = getLLMConfig();

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLMResponse> {
    switch (this.config.provider) {
      case 'anthropic':
        return this.chatWithAnthropic(messages, systemPrompt);
      case 'openai':
        return this.chatWithOpenAI(messages, systemPrompt);
      default:
        throw new Error(`Unknown LLM provider: ${this.config.provider}`);
    }
  }

  async *stream(messages: LLMMessage[], systemPrompt?: string): AsyncGenerator<string> {
    switch (this.config.provider) {
      case 'anthropic':
        yield* this.streamWithAnthropic(messages, systemPrompt);
        break;
      case 'openai':
        yield* this.streamWithOpenAI(messages, systemPrompt);
        break;
    }
  }

  private async chatWithAnthropic(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const response = await anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private async chatWithOpenAI(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    const response = await openai.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: allMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return {
      content: response.choices[0].message.content || '',
      usage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      } : undefined,
    };
  }

  private async *streamWithAnthropic(
    messages: LLMMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const stream = await anthropic.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  private async *streamWithOpenAI(
    messages: LLMMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    const stream = await openai.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: allMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  getProvider(): LLMProvider {
    return this.config.provider;
  }
}

export const llmService = new LLMService();
```

### AI Fallback Handling

**File: `apps/api/src/services/ai-fallback.service.ts`**
```typescript
import { llmService } from './llm.service';
import { embeddingService } from './embedding.service';

/**
 * Gracefully handle AI service failures
 */
export async function withAIFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<{ result: T; usedFallback: boolean; error?: string }> {
  try {
    const result = await operation();
    return { result, usedFallback: false };
  } catch (error) {
    console.error(`AI operation failed (${context}):`, error);

    return {
      result: fallback,
      usedFallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check AI service availability
 */
export async function checkAIHealth(): Promise<{
  llm: { available: boolean; provider: string };
  embedding: { available: boolean; provider: string };
}> {
  let llmAvailable = false;
  let embeddingAvailable = false;

  try {
    await llmService.chat([{ role: 'user', content: 'ping' }]);
    llmAvailable = true;
  } catch {
    llmAvailable = false;
  }

  try {
    await embeddingService.embed('test');
    embeddingAvailable = true;
  } catch {
    embeddingAvailable = false;
  }

  return {
    llm: { available: llmAvailable, provider: llmService.getProvider() },
    embedding: { available: embeddingAvailable, provider: embeddingService.getProvider() },
  };
}
```

---

## Updated Environment Variables

```bash
# .env

# ===========================================
# AI/LLM Providers (configurable)
# ===========================================

# Active providers: openai | ollama (embedding), anthropic | openai (llm)
EMBEDDING_PROVIDER=openai
LLM_PROVIDER=anthropic

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Ollama (local embeddings)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

---

## Additional Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/config/embedding.ts` | Embedding provider config |
| `apps/api/src/config/llm.ts` | LLM provider config |
| `apps/api/src/services/llm.service.ts` | Multi-provider LLM service |
| `apps/api/src/services/ai-fallback.service.ts` | AI fallback handling |
