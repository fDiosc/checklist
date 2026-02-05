-- Migration: Slug Partial Unique Indexes
-- Purpose: Allow subworkspaces to have same slug as parent workspace
-- 
-- This replaces the global unique constraint on slug with:
-- 1. Unique slug among parent workspaces (where parent_workspace_id IS NULL)
-- 2. Unique slug per parent workspace (where parent_workspace_id IS NOT NULL)

-- Drop the existing global unique constraint on slug
DROP INDEX IF EXISTS "workspaces_slug_key";

-- Create unique index for parent workspaces only
-- Ensures no two parent workspaces can have the same slug
CREATE UNIQUE INDEX "workspaces_slug_parent_unique" 
ON "workspaces" ("slug") 
WHERE "parent_workspace_id" IS NULL;

-- Create unique index for subworkspaces within each parent
-- Ensures no two subworkspaces of the same parent can have the same slug
-- But allows a subworkspace to have the same slug as its parent or as subworkspaces of other parents
CREATE UNIQUE INDEX "workspaces_slug_subworkspace_unique" 
ON "workspaces" ("slug", "parent_workspace_id") 
WHERE "parent_workspace_id" IS NOT NULL;

-- Add a simple index for slug lookups
CREATE INDEX IF NOT EXISTS "workspaces_slug_idx" ON "workspaces" ("slug");
