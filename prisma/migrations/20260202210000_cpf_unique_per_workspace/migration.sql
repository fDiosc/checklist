-- Remove global unique constraint on cpf
DROP INDEX IF EXISTS "users_cpf_key";

-- Add composite unique constraint for cpf + workspace_id
-- This allows the same CPF to exist in different workspaces
CREATE UNIQUE INDEX IF NOT EXISTS "users_cpf_workspace_id_key" ON "users"("cpf", "workspace_id");
