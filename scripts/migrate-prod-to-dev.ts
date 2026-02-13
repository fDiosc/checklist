/**
 * Migration Script: Prod -> Dev
 * 
 * Transfers the following from production to development DB:
 * 1. database_options (global) - clear & replace
 * 2. eme (global) - clear & replace
 * 3. rural_regions (global) - clear & replace
 * 4. templates (all 16) - copy with sections and items, mapping to "Maxsum BR" workspace
 * 
 * NOTE: Prod DB has an older schema (no workspaces, no levels/classifications).
 *       This script uses raw SQL for prod reads and Prisma for dev writes.
 * 
 * Usage: npx tsx scripts/migrate-prod-to-dev.ts
 */

import { PrismaClient } from '@prisma/client';

const PROD_URL = "postgresql://neondb_owner:npg_XEtNw49dlpUf@ep-green-poetry-ahc167wr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const DEV_URL = "postgresql://neondb_owner:npg_XEtNw49dlpUf@ep-dawn-cell-ahxz22yu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prismaProd = new PrismaClient({ datasourceUrl: PROD_URL });
const prismaDev = new PrismaClient({ datasourceUrl: DEV_URL });

// ============================================
// TYPES for raw SQL results from prod
// ============================================

interface ProdTemplate {
    id: string;
    name: string;
    folder: string;
    status: string;
    requiresProducerIdentification: boolean;
    isContinuous: boolean;
    actionPlanPromptId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}

interface ProdSection {
    id: string;
    templateId: string;
    name: string;
    order: number;
    iterateOverFields: boolean;
}

interface ProdItem {
    id: string;
    sectionId: string;
    name: string;
    type: string;
    order: number;
    required: boolean;
    validityControl: boolean;
    observationEnabled: boolean;
    requestArtifact: boolean;
    artifactRequired: boolean;
    askForQuantity: boolean;
    options: string[];
    databaseSource: string | null;
}

// ============================================
// GLOBAL TABLES MIGRATION (same as before - Prisma works here)
// ============================================

async function migrateGlobalTables() {
    console.log('\n========================================');
    console.log('PHASE 1: Global Tables Migration');
    console.log('========================================\n');

    // 1. Database Options
    console.log('[database_options] Reading from Prod...');
    const options: any[] = await prismaProd.$queryRaw`SELECT * FROM database_options`;
    console.log(`[database_options] Found ${options.length} records in Prod.`);

    if (options.length > 0) {
        console.log('[database_options] Clearing Dev...');
        await prismaDev.databaseOption.deleteMany();

        console.log('[database_options] Inserting into Dev...');
        const BATCH_SIZE = 500;
        for (let i = 0; i < options.length; i += BATCH_SIZE) {
            const batch = options.slice(i, i + BATCH_SIZE).map(o => ({
                id: o.id,
                source: o.source,
                label: o.label,
                value: o.value,
                composition: o.composition,
                unit: o.unit,
            }));
            await prismaDev.databaseOption.createMany({ data: batch });
        }
        console.log(`[database_options] Done. Inserted ${options.length} records.\n`);
    }

    // 2. EME
    console.log('[eme] Reading from Prod...');
    const emeRecords: any[] = await prismaProd.$queryRaw`SELECT * FROM eme`;
    console.log(`[eme] Found ${emeRecords.length} records in Prod.`);

    if (emeRecords.length > 0) {
        console.log('[eme] Clearing Dev...');
        await prismaDev.eME.deleteMany();

        console.log('[eme] Inserting into Dev...');
        await prismaDev.eME.createMany({
            data: emeRecords.map(e => ({
                id: e.id,
                uf: e.uf,
                codigo: e.codigo,
                eme: e.eme,
            }))
        });
        console.log(`[eme] Done. Inserted ${emeRecords.length} records.\n`);
    }

    // 3. Rural Regions
    console.log('[rural_regions] Reading from Prod...');
    const ruralRegions: any[] = await prismaProd.$queryRaw`SELECT * FROM rural_regions`;
    console.log(`[rural_regions] Found ${ruralRegions.length} records in Prod.`);

    if (ruralRegions.length > 0) {
        console.log('[rural_regions] Clearing Dev...');
        await prismaDev.ruralRegion.deleteMany();

        console.log('[rural_regions] Inserting into Dev...');
        const BATCH_SIZE = 1000;
        for (let i = 0; i < ruralRegions.length; i += BATCH_SIZE) {
            const batch = ruralRegions.slice(i, i + BATCH_SIZE).map(r => ({
                id: r.id,
                munCode: r.munCode,
                municipality: r.municipality,
                stateCode: r.stateCode,
                stateShort: r.stateShort,
                rrCode: r.rrCode,
            }));
            await prismaDev.ruralRegion.createMany({ data: batch });
        }
        console.log(`[rural_regions] Done. Inserted ${ruralRegions.length} records.\n`);
    }
}

// ============================================
// TEMPLATE MIGRATION (using raw SQL for prod)
// ============================================

async function migrateTemplates() {
    console.log('\n========================================');
    console.log('PHASE 2: Templates Migration');
    console.log('========================================\n');

    // Find "Maxsum BR" workspace in dev
    const devWorkspaces = await prismaDev.workspace.findMany({
        where: { name: { contains: 'Maxsum', mode: 'insensitive' } }
    });

    console.log('Dev workspaces found:');
    devWorkspaces.forEach(w => console.log(`  - "${w.name}" (id: ${w.id})`));

    const devWs = devWorkspaces.find(w => w.name.toLowerCase().includes('maxsum br')) || devWorkspaces[0];
    if (!devWs) {
        console.error('ERROR: No workspace matching "Maxsum" found in Dev DB.');
        return;
    }
    console.log(`\nUsing Dev workspace: "${devWs.name}" (${devWs.id})\n`);

    // Find a valid user in dev for createdBy
    const devUser = await prismaDev.user.findFirst({
        where: {
            OR: [
                { workspaceId: devWs.id, role: 'ADMIN' },
                { workspaceId: devWs.id, role: 'SUPERVISOR' },
                { role: 'SUPERADMIN' }
            ]
        }
    });

    if (!devUser) {
        console.error('ERROR: No user found in Dev. Run seed-cadastros.ts first.');
        return;
    }
    console.log(`Using Dev user for createdBy: "${devUser.name}" (${devUser.id})\n`);

    // Read all templates from prod using raw SQL
    const prodTemplates: ProdTemplate[] = await prismaProd.$queryRaw`
        SELECT id, name, folder, status, 
               "requiresProducerIdentification" as "requiresProducerIdentification", 
               "isContinuous" as "isContinuous",
               "actionPlanPromptId" as "actionPlanPromptId",
               "createdById" as "createdById",
               "createdAt" as "createdAt",
               "updatedAt" as "updatedAt"
        FROM templates ORDER BY folder, name
    `;
    console.log(`Found ${prodTemplates.length} templates in Prod.\n`);

    // Read all sections from prod
    const prodSections: ProdSection[] = await prismaProd.$queryRaw`
        SELECT id, "templateId" as "templateId", name, "order", 
               "iterateOverFields" as "iterateOverFields"
        FROM sections ORDER BY "templateId", "order"
    `;
    console.log(`Found ${prodSections.length} sections in Prod.`);

    // Read all items from prod
    const prodItems: ProdItem[] = await prismaProd.$queryRaw`
        SELECT id, "sectionId" as "sectionId", name, type, "order", required, 
               "validityControl" as "validityControl",
               "observationEnabled" as "observationEnabled",
               "requestArtifact" as "requestArtifact",
               "artifactRequired" as "artifactRequired",
               "askForQuantity" as "askForQuantity",
               options, 
               "databaseSource" as "databaseSource"
        FROM items ORDER BY "sectionId", "order"
    `;
    console.log(`Found ${prodItems.length} items in Prod.\n`);

    // Group sections and items by parent
    const sectionsByTemplate = new Map<string, ProdSection[]>();
    for (const sec of prodSections) {
        const list = sectionsByTemplate.get(sec.templateId) || [];
        list.push(sec);
        sectionsByTemplate.set(sec.templateId, list);
    }

    const itemsBySection = new Map<string, ProdItem[]>();
    for (const item of prodItems) {
        const list = itemsBySection.get(item.sectionId) || [];
        list.push(item);
        itemsBySection.set(item.sectionId, list);
    }

    // Migrate each template
    for (const template of prodTemplates) {
        const sections = sectionsByTemplate.get(template.id) || [];
        const totalItems = sections.reduce((sum, s) => sum + (itemsBySection.get(s.id) || []).length, 0);

        console.log(`--- Migrating: "${template.name}" (${sections.length} sections, ${totalItems} items) ---`);

        try {
            // Check if template already exists in dev (by name + workspace)
            const existing = await prismaDev.template.findFirst({
                where: { name: template.name, workspaceId: devWs.id }
            });

            if (existing) {
                console.log(`    Exists in Dev (id: ${existing.id}). Deleting...`);
                await prismaDev.template.delete({ where: { id: existing.id } });
            }

            // Check ID collision
            const existingById = await prismaDev.template.findUnique({
                where: { id: template.id }
            });
            if (existingById) {
                console.log(`    WARNING: Template ID collision in Dev for "${existingById.name}". Skipping.`);
                continue;
            }

            // Insert within a transaction
            await prismaDev.$transaction(async (tx) => {
                // 1. Create template (mapping to dev schema)
                await tx.template.create({
                    data: {
                        id: template.id,
                        workspaceId: devWs.id,
                        name: template.name,
                        folder: template.folder,
                        status: template.status as any,
                        requiresProducerIdentification: template.requiresProducerIdentification,
                        isContinuous: template.isContinuous,
                        isLevelBased: false,          // New field - default
                        levelAccumulative: false,      // New field - default
                        actionPlanPromptId: template.actionPlanPromptId,
                        correctionActionPlanPromptId: null,  // New field
                        completionActionPlanPromptId: null,  // New field
                        createdById: devUser.id,
                    }
                });

                // 2. Create sections
                for (const section of sections) {
                    await tx.section.create({
                        data: {
                            id: section.id,
                            templateId: template.id,
                            name: section.name,
                            order: section.order,
                            iterateOverFields: section.iterateOverFields,
                            levelId: null,  // New field - no levels in prod
                        }
                    });

                    // 3. Create items
                    const items = itemsBySection.get(section.id) || [];
                    if (items.length > 0) {
                        await tx.item.createMany({
                            data: items.map(item => ({
                                id: item.id,
                                sectionId: section.id,
                                name: item.name,
                                type: item.type as any,
                                order: item.order,
                                required: item.required,
                                validityControl: item.validityControl,
                                observationEnabled: item.observationEnabled,
                                requestArtifact: item.requestArtifact,
                                artifactRequired: item.artifactRequired,
                                askForQuantity: item.askForQuantity,
                                options: item.options,
                                databaseSource: item.databaseSource,
                                // New fields - defaults
                                classificationId: null,
                                blocksAdvancementToLevelId: null,
                                allowNA: false,
                                responsible: null,
                                reference: null,
                            }))
                        });
                    }
                }
            });

            console.log(`    OK\n`);
        } catch (error: any) {
            console.error(`    FAILED: ${error.message}\n`);
        }
    }
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('=== MIGRATION: Prod -> Dev ===');
    console.log(`Prod: ${PROD_URL.split('@')[1]?.split('/')[0]}`);
    console.log(`Dev: ${DEV_URL.split('@')[1]?.split('/')[0]}`);
    console.log('');

    try {
        await migrateGlobalTables();
        await migrateTemplates();
        console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY ===\n');
    } catch (error) {
        console.error('\n=== MIGRATION FAILED ===\n', error);
    } finally {
        await prismaProd.$disconnect();
        await prismaDev.$disconnect();
    }
}

main();
