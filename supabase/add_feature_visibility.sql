-- Add feature_visibility JSONB column to company_features
ALTER TABLE company_features ADD COLUMN IF NOT EXISTS feature_visibility JSONB DEFAULT '{}'::jsonb;
