-- ============================================
-- Add Workspaces and Multi-tenancy Support
-- ============================================

-- 1. Create workspaces table
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- 2. Create default Maxsum workspace and get its ID
INSERT INTO "workspaces" ("id", "name", "slug", "updated_at")
VALUES ('ws_maxsum_default', 'Maxsum', 'maxsum', CURRENT_TIMESTAMP);

-- 3. Update users table - add new columns
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "workspace_id" TEXT;

-- Set temporary password hash for existing users (they will need to be recreated)
UPDATE "users" SET "password_hash" = 'NEEDS_RESET' WHERE "password_hash" IS NULL;

-- Make password_hash required
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- Add workspace_id index
CREATE INDEX "users_workspace_id_idx" ON "users"("workspace_id");

-- Add foreign key for workspace
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Add workspace_id to producers
ALTER TABLE "producers" ADD COLUMN "workspace_id" TEXT;

-- Migrate existing producers to Maxsum workspace
UPDATE "producers" SET "workspace_id" = 'ws_maxsum_default' WHERE "workspace_id" IS NULL;

-- Make workspace_id required for producers
ALTER TABLE "producers" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Add index and foreign key
CREATE INDEX "producers_workspace_id_idx" ON "producers"("workspace_id");
ALTER TABLE "producers" ADD CONSTRAINT "producers_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Add workspace_id to templates
ALTER TABLE "templates" ADD COLUMN "workspace_id" TEXT;

-- Migrate existing templates to Maxsum workspace
UPDATE "templates" SET "workspace_id" = 'ws_maxsum_default' WHERE "workspace_id" IS NULL;

-- Make workspace_id required for templates
ALTER TABLE "templates" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Add index and foreign key
CREATE INDEX "templates_workspace_id_idx" ON "templates"("workspace_id");
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Add workspace_id to checklists
ALTER TABLE "checklists" ADD COLUMN "workspace_id" TEXT;

-- Migrate existing checklists to Maxsum workspace
UPDATE "checklists" SET "workspace_id" = 'ws_maxsum_default' WHERE "workspace_id" IS NULL;

-- Make workspace_id required for checklists
ALTER TABLE "checklists" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Add index and foreign key
CREATE INDEX "checklists_workspace_id_idx" ON "checklists"("workspace_id");
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Add workspace_id to audit_logs (optional)
ALTER TABLE "audit_logs" ADD COLUMN "workspace_id" TEXT;

-- Migrate existing audit logs to Maxsum workspace
UPDATE "audit_logs" SET "workspace_id" = 'ws_maxsum_default' WHERE "workspace_id" IS NULL;

-- Add index and foreign key
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs"("workspace_id");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Update ai_prompts for workspace support
ALTER TABLE "ai_prompts" ADD COLUMN "workspace_id" TEXT;

-- Drop old unique constraint on slug
DROP INDEX IF EXISTS "ai_prompts_slug_key";

-- Add new composite unique constraint (workspace_id + slug)
CREATE UNIQUE INDEX "ai_prompts_workspace_id_slug_key" ON "ai_prompts"("workspace_id", "slug");

-- Add index and foreign key
CREATE INDEX "ai_prompts_workspace_id_idx" ON "ai_prompts"("workspace_id");
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_workspace_id_fkey" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Migrate existing users to Maxsum workspace
UPDATE "users" SET "workspace_id" = 'ws_maxsum_default' WHERE "workspace_id" IS NULL;
