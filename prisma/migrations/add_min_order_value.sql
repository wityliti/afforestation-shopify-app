-- Add min_order_value column for minimum order threshold (e.g. $50 for threshold rules)
-- Add trigger_rules column for multiple rules (JSON array)
-- Run manually if using shared DB: psql $DATABASE_URL -f prisma/migrations/add_min_order_value.sql
ALTER TABLE shopify_settings ADD COLUMN IF NOT EXISTS min_order_value DOUBLE PRECISION;
ALTER TABLE shopify_settings ADD COLUMN IF NOT EXISTS trigger_rules JSONB;