-- Migration: CPF Unique Per Workspace
-- Purpose: Allow same CPF in different workspaces (parent + subworkspace can have same producer)

-- Drop the existing global unique constraint on cpf
DROP INDEX IF EXISTS "producers_cpf_key";

-- Create unique constraint for CPF within workspace
-- This allows the same CPF to exist in parent workspace AND its subworkspaces
CREATE UNIQUE INDEX "producers_cpf_workspace_unique" 
ON "producers" ("cpf", "workspace_id") 
WHERE "cpf" IS NOT NULL;
