CREATE TYPE segment_status AS ENUM ('pending','queued','processing','completed','failed','cancelled');
CREATE TABLE generation_segments (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  position integer NOT NULL,
  source_media_id text NOT NULL REFERENCES media_assets(id),
  destination_media_id text NOT NULL REFERENCES media_assets(id),
  status segment_status NOT NULL DEFAULT 'pending',
  prompt text NOT NULL,
  negative_prompt text NOT NULL,
  prompt_version text NOT NULL,
  output_storage_key text,
  estimated_cost numeric NOT NULL,
  actual_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, position)
);
CREATE TABLE generation_attempts (id text PRIMARY KEY,segment_id text NOT NULL REFERENCES generation_segments(id) ON DELETE CASCADE,attempt integer NOT NULL,provider_prediction_id text,status segment_status NOT NULL DEFAULT 'queued',error_code text,input jsonb NOT NULL,output jsonb,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(segment_id,attempt));
CREATE TABLE processed_webhooks (provider text NOT NULL,event_id text NOT NULL,processed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(provider,event_id));
