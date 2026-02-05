/**
 * Migration Script: Setup Workspaces and Reset Users
 * 
 * This script:
 * 1. Ensures the Maxsum workspace exists
 * 2. Creates a new SuperAdmin user with temporary password
 * 3. Updates all templates/checklists to reference the new SuperAdmin
 * 4. Deletes old users
 * 
 * Run with: npx tsx scripts/migrate-to-workspaces.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'admin@merx.tech';
const TEMP_PASSWORD = 'MerxAdmin2026!'; // User must change on first login

async function main() {
    console.log('===========================================');
    console.log('Workspace Migration Script');
    console.log('===========================================\n');

    // 1. Check/Create Maxsum workspace
    console.log('1. Checking Maxsum workspace...');
    let workspace = await prisma.workspace.findUnique({
        where: { slug: 'maxsum' }
    });

    if (!workspace) {
        workspace = await prisma.workspace.create({
            data: {
                id: 'ws_maxsum_default',
                name: 'Maxsum',
                slug: 'maxsum'
            }
        });
        console.log('   ✓ Created Maxsum workspace');
    } else {
        console.log('   ✓ Maxsum workspace already exists');
    }

    // 2. Count existing data
    console.log('\n2. Current data status:');
    const producerCount = await prisma.producer.count();
    const templateCount = await prisma.template.count();
    const checklistCount = await prisma.checklist.count();
    const userCount = await prisma.user.count();
    
    console.log(`   - Producers: ${producerCount}`);
    console.log(`   - Templates: ${templateCount}`);
    console.log(`   - Checklists: ${checklistCount}`);
    console.log(`   - Users: ${userCount}`);

    // 3. Create SuperAdmin user first
    console.log('\n3. Creating SuperAdmin user...');
    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);
    
    // Check if superadmin already exists
    let superadmin = await prisma.user.findUnique({
        where: { email: SUPERADMIN_EMAIL }
    });

    if (superadmin) {
        // Update existing user to be superadmin
        superadmin = await prisma.user.update({
            where: { email: SUPERADMIN_EMAIL },
            data: {
                passwordHash: passwordHash,
                mustChangePassword: true,
                role: 'SUPERADMIN',
                workspaceId: null
            }
        });
        console.log(`   ✓ Updated existing user to SuperAdmin: ${superadmin.email}`);
    } else {
        superadmin = await prisma.user.create({
            data: {
                email: SUPERADMIN_EMAIL,
                name: 'Super Admin',
                passwordHash: passwordHash,
                mustChangePassword: true,
                role: 'SUPERADMIN',
                workspaceId: null
            }
        });
        console.log(`   ✓ Created SuperAdmin: ${superadmin.email}`);
    }
    
    console.log(`   ⚠ Temporary password: ${TEMP_PASSWORD}`);
    console.log(`   ⚠ User must change password on first login!`);

    // 4. Update templates/checklists createdById to SuperAdmin
    console.log('\n4. Updating createdById references...');
    
    await prisma.template.updateMany({
        data: { createdById: superadmin.id }
    });
    console.log(`   ✓ Updated ${templateCount} templates to SuperAdmin`);
    
    await prisma.checklist.updateMany({
        data: { createdById: superadmin.id }
    });
    console.log(`   ✓ Updated ${checklistCount} checklists to SuperAdmin`);

    // 5. Clear filledById references in responses
    console.log('\n5. Clearing user references...');
    await prisma.response.updateMany({
        where: { filledById: { not: null } },
        data: { filledById: null }
    });
    console.log('   ✓ Cleared filledById references in responses');

    // Delete audit logs (they reference users)
    await prisma.auditLog.deleteMany({});
    console.log('   ✓ Deleted audit logs');

    // Clear assignedSupervisors from producers
    const producers = await prisma.producer.findMany({
        include: { assignedSupervisors: true }
    });
    
    for (const producer of producers) {
        if (producer.assignedSupervisors.length > 0) {
            await prisma.producer.update({
                where: { id: producer.id },
                data: {
                    assignedSupervisors: { set: [] }
                }
            });
        }
    }
    console.log('   ✓ Cleared supervisor assignments from producers');

    // 6. Delete all users except SuperAdmin
    console.log('\n6. Deleting old users...');
    const deleteResult = await prisma.user.deleteMany({
        where: {
            id: { not: superadmin.id }
        }
    });
    console.log(`   ✓ Deleted ${deleteResult.count} old users`);

    // 7. Summary
    console.log('\n===========================================');
    console.log('Migration Complete!');
    console.log('===========================================');
    console.log(`
Next steps:
1. Run the application
2. Login with: ${SUPERADMIN_EMAIL} / ${TEMP_PASSWORD}
3. Change your password
4. Create workspace admins for each client
5. Assign existing data to appropriate workspaces
`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('Migration failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
