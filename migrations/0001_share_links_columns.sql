-- Adds the columns that the shared/schema.ts model declares for share_links
-- but that were missing from the production Neon database, causing
-- POST /api/projects/:id/share to fail with:
--   error: column "editable" of relation "share_links" does not exist
--
-- Safe to re-run: every statement is idempotent.
--
-- Apply with either:
--   1) Neon SQL Editor → paste this file → Run.
--   2) `npm run db:push` from a shell with the production DATABASE_URL.

ALTER TABLE share_links ADD COLUMN IF NOT EXISTS editable boolean DEFAULT false;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS customer_edit_token text;
