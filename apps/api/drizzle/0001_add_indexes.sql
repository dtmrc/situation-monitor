-- Performance indexes for common queries
-- Run this migration after the schema is set up

-- Projects: list by owner, filter by status
CREATE INDEX IF NOT EXISTS idx_projects_owner_status
  ON app.projects (owner_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_org
  ON app.projects (organization_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Assessments: list by project
CREATE INDEX IF NOT EXISTS idx_assessments_project
  ON app.assessments (project_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Factors: query by assessment and domain
CREATE INDEX IF NOT EXISTS idx_factors_assessment_domain
  ON app.factors (assessment_id, domain, sort_order);

-- Factor evidence: query by factor
CREATE INDEX IF NOT EXISTS idx_factor_evidence_factor
  ON app.factor_evidence (factor_id, created_at DESC);

-- Threats: query by assessment, filter by status
CREATE INDEX IF NOT EXISTS idx_threats_assessment_status
  ON app.threats (assessment_id, status)
  WHERE deleted_at IS NULL;

-- Organization members: query membership
CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON app.organization_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org
  ON app.organization_members (organization_id, role);

-- Organization invitations: lookup by token
CREATE INDEX IF NOT EXISTS idx_org_invitations_token
  ON app.organization_invitations (token)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_invitations_email
  ON app.organization_invitations (email, organization_id)
  WHERE accepted_at IS NULL;

-- PIRs: query by project
CREATE INDEX IF NOT EXISTS idx_pirs_project
  ON app.pirs (project_id, priority DESC);

-- NAIs: query by project
CREATE INDEX IF NOT EXISTS idx_nais_project
  ON app.nais (project_id, created_at DESC);

-- Sources: query by project and reliability
CREATE INDEX IF NOT EXISTS idx_sources_project
  ON app.sources (project_id, reliability DESC);

-- Indicators: query by PIR
CREATE INDEX IF NOT EXISTS idx_indicators_pir
  ON app.indicators (pir_id, sort_order);

-- Tripwires: query by NAI
CREATE INDEX IF NOT EXISTS idx_tripwires_nai
  ON app.tripwires (nai_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tripwires_triggered
  ON app.tripwires (is_triggered, triggered_at DESC)
  WHERE is_triggered = true;

-- Observations: query by indicator
CREATE INDEX IF NOT EXISTS idx_observations_indicator
  ON app.observations (indicator_id, observed_at DESC);

-- CoG: query by assessment
CREATE INDEX IF NOT EXISTS idx_cog_assessment
  ON app.centers_of_gravity (assessment_id, cog_type);

-- CoG elements: query by CoG
CREATE INDEX IF NOT EXISTS idx_cog_elements_cog
  ON app.cog_elements (cog_id, element_type, sort_order);

-- Feed items: time-series queries
CREATE INDEX IF NOT EXISTS idx_feed_items_project_time
  ON app.feed_items (project_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_feed_items_type_time
  ON app.feed_items (type, timestamp DESC);

-- Partial index for unprocessed items
CREATE INDEX IF NOT EXISTS idx_feed_items_unprocessed
  ON app.feed_items (project_id, created_at)
  WHERE processed_at IS NULL;

-- Users: email lookup (already unique, but lowercase for case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON app.users (LOWER(email));

-- Audit log: time-series with user filter
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time
  ON app.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON app.audit_log (resource_type, resource_id, created_at DESC);

-- Documents: for RAG queries
CREATE INDEX IF NOT EXISTS idx_documents_project
  ON app.documents (project_id, created_at DESC);
