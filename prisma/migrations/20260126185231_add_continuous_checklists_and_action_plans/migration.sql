-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'PRODUCER');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('FILE', 'TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DATE', 'PROPERTY_MAP', 'FIELD_SELECTOR', 'DROPDOWN_SELECT');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PARTIALLY_FINALIZED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('MISSING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "cpf" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SUPERVISOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "esgStatus" TEXT,
    "esgData" JSONB,
    "esgLastCheck" TIMESTAMP(3),

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_users" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresProducerIdentification" BOOLEAN NOT NULL DEFAULT false,
    "isContinuous" BOOLEAN NOT NULL DEFAULT false,
    "actionPlanPromptId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "iterateOverFields" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "validityControl" BOOLEAN NOT NULL DEFAULT false,
    "observationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requestArtifact" BOOLEAN NOT NULL DEFAULT false,
    "artifactRequired" BOOLEAN NOT NULL DEFAULT false,
    "askForQuantity" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "databaseSource" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "producerId" TEXT,
    "subUserId" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "publicToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentVia" TEXT,
    "sentTo" TEXT,
    "parentId" TEXT,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'MISSING',
    "answer" TEXT,
    "quantity" TEXT,
    "observation" TEXT,
    "fileUrl" TEXT,
    "validity" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "aiFlag" TEXT,
    "aiMessage" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "filledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fieldId" TEXT NOT NULL DEFAULT '__global__',

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plans" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_maps" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "propertyLocation" JSONB,
    "carCode" TEXT,
    "carData" JSONB,
    "carEsgStatus" TEXT,
    "carEsgData" JSONB,
    "carEsgLastCheck" TIMESTAMP(3),
    "fields" JSONB NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "emeCode" TEXT,
    "ruralRegionCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_options" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "composition" TEXT,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rural_regions" (
    "id" TEXT NOT NULL,
    "munCode" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateShort" TEXT NOT NULL,
    "rrCode" INTEGER NOT NULL,

    CONSTRAINT "rural_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eme" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "codigo" INTEGER NOT NULL,
    "eme" TEXT NOT NULL,

    CONSTRAINT "eme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SupervisorProducers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "producers_cpf_key" ON "producers"("cpf");

-- CreateIndex
CREATE INDEX "producers_cpf_idx" ON "producers"("cpf");

-- CreateIndex
CREATE INDEX "producers_email_idx" ON "producers"("email");

-- CreateIndex
CREATE INDEX "sub_users_producerId_idx" ON "sub_users"("producerId");

-- CreateIndex
CREATE INDEX "templates_status_idx" ON "templates"("status");

-- CreateIndex
CREATE INDEX "templates_createdById_idx" ON "templates"("createdById");

-- CreateIndex
CREATE INDEX "sections_templateId_idx" ON "sections"("templateId");

-- CreateIndex
CREATE INDEX "items_sectionId_idx" ON "items"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "checklists_publicToken_key" ON "checklists"("publicToken");

-- CreateIndex
CREATE INDEX "checklists_publicToken_idx" ON "checklists"("publicToken");

-- CreateIndex
CREATE INDEX "checklists_producerId_idx" ON "checklists"("producerId");

-- CreateIndex
CREATE INDEX "checklists_status_idx" ON "checklists"("status");

-- CreateIndex
CREATE INDEX "responses_checklistId_idx" ON "responses"("checklistId");

-- CreateIndex
CREATE UNIQUE INDEX "responses_checklistId_itemId_fieldId_key" ON "responses"("checklistId", "itemId", "fieldId");

-- CreateIndex
CREATE INDEX "property_maps_producerId_idx" ON "property_maps"("producerId");

-- CreateIndex
CREATE INDEX "audit_logs_checklistId_idx" ON "audit_logs"("checklistId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_slug_key" ON "ai_prompts"("slug");

-- CreateIndex
CREATE INDEX "database_options_source_idx" ON "database_options"("source");

-- CreateIndex
CREATE UNIQUE INDEX "rural_regions_munCode_key" ON "rural_regions"("munCode");

-- CreateIndex
CREATE INDEX "rural_regions_stateShort_idx" ON "rural_regions"("stateShort");

-- CreateIndex
CREATE INDEX "rural_regions_rrCode_idx" ON "rural_regions"("rrCode");

-- CreateIndex
CREATE UNIQUE INDEX "eme_uf_key" ON "eme"("uf");

-- CreateIndex
CREATE UNIQUE INDEX "_SupervisorProducers_AB_unique" ON "_SupervisorProducers"("A", "B");

-- CreateIndex
CREATE INDEX "_SupervisorProducers_B_index" ON "_SupervisorProducers"("B");

-- AddForeignKey
ALTER TABLE "sub_users" ADD CONSTRAINT "sub_users_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "checklists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_subUserId_fkey" FOREIGN KEY ("subUserId") REFERENCES "sub_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_filledById_fkey" FOREIGN KEY ("filledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_maps" ADD CONSTRAINT "property_maps_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupervisorProducers" ADD CONSTRAINT "_SupervisorProducers_A_fkey" FOREIGN KEY ("A") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupervisorProducers" ADD CONSTRAINT "_SupervisorProducers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
