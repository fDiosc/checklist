
import { PrismaClient } from '@prisma/client';

// URLs provided by user
const PROD_URL = "postgresql://neondb_owner:npg_XEtNw49dlpUf@ep-green-poetry-ahc167wr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const DEV_URL = "postgresql://neondb_owner:npg_XEtNw49dlpUf@ep-dawn-cell-ahxz22yu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prismaProd = new PrismaClient({ datasourceUrl: PROD_URL });
const prismaDev = new PrismaClient({ datasourceUrl: DEV_URL });

async function cloneTable(tableName: string, modelName: string, transformFn?: (data: any[]) => any[]) {
    console.log(`\n[${tableName}] Reading from Prod...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (prismaProd as any)[modelName].findMany();
    console.log(`[${tableName}] Found ${data.length} records.`);

    if (data.length === 0) return;

    console.log(`[${tableName}] Clearing Dev table...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
        await (prismaDev as any)[modelName].deleteMany();
    } catch (e) {
        console.warn(`[${tableName}] Warning clearing table (might be empty or have constraints):`, e);
    }

    const dataToInsert = transformFn ? transformFn(data) : data;

    // Insert in batches
    console.log(`[${tableName}] Inserting into Dev...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + BATCH_SIZE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prismaDev as any)[modelName].createMany({ data: batch });
    }
    console.log(`[${tableName}] Done.`);
}

async function main() {
    try {
        // 1. Independent config/lookup tables
        await cloneTable('System Config', 'systemConfig');
        await cloneTable('AI Prompts', 'aiPrompt');
        await cloneTable('Database Options', 'databaseOption');
        await cloneTable('EME', 'eME');
        await cloneTable('Rural Regions', 'ruralRegion');

        // 2. Core Users
        await cloneTable('Users', 'user');

        // 3. Templates (and structure)
        await cloneTable('Templates', 'template');
        await cloneTable('Sections', 'section');
        await cloneTable('Items', 'item');

        // 4. Producers (and related)
        await cloneTable('Producers', 'producer');
        await cloneTable('SubUsers', 'subUser');
        await cloneTable('Property Maps', 'propertyMap');

        // 5. Checklists - Handle circular dependency (parentId)
        console.log(`\n[Checklists] Reading from Prod...`);
        const checklists = await prismaProd.checklist.findMany();
        console.log(`[Checklists] Found ${checklists.length} records.`);

        if (checklists.length > 0) {
            console.log(`[Checklists] Clearing Dev table...`);
            await prismaDev.checklist.deleteMany();

            // Insert without parentId first to avoid FK errors
            const checklistsNoParent = checklists.map(c => ({ ...c, parentId: null }));
            console.log(`[Checklists] Inserting base records (no parents)...`);
            await prismaDev.checklist.createMany({ data: checklistsNoParent });

            // 6. Responses & Logs (depend on Checklist)
            await cloneTable('Responses', 'response');
            await cloneTable('Audit Logs', 'auditLog');
            await cloneTable('Reports', 'report');
            await cloneTable('Action Plans', 'actionPlan');

            // 7. Update Checklists to restore parentId
            console.log(`[Checklists] Restoring parent relationships...`);
            const checklistsWithParent = checklists.filter(c => c.parentId);
            for (const c of checklistsWithParent) {
                await prismaDev.checklist.update({
                    where: { id: c.id },
                    data: { parentId: c.parentId }
                });
            }
            console.log(`[Checklists] Restored ${checklistsWithParent.length} parent links.`);
        }

        console.log('\n--- CLONE COMPLETED SUCCESSFULLY ---');

    } catch (e) {
        console.error('\nCLONE FAILED:', e);
    } finally {
        await prismaProd.$disconnect();
        await prismaDev.$disconnect();
    }
}

main();
