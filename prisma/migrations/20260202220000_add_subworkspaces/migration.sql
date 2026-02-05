-- AlterTable: Add subworkspace support to workspaces
ALTER TABLE "workspaces" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "parent_workspace_id" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "has_subworkspaces" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "workspaces_parent_workspace_id_idx" ON "workspaces"("parent_workspace_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_parent_workspace_id_fkey" FOREIGN KEY ("parent_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
