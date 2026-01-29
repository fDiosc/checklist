const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    let output = '';

    const checklistId = 'cmkxy82li00i3ajn9ky20z8ms';

    output += `=== CHECKLIST ${checklistId} ===\n\n`;

    const checklist = await prisma.checklist.findUnique({
        where: { id: checklistId },
        include: {
            actionPlans: true,
            parent: {
                select: { id: true, actionPlans: true }
            }
        }
    });

    if (!checklist) {
        output += 'Checklist not found!\n';
    } else {
        output += `Type: ${checklist.type}\n`;
        output += `Status: ${checklist.status}\n`;
        output += `ParentId: ${checklist.parentId}\n`;
        output += `\nActionPlans on THIS checklist: ${checklist.actionPlans?.length || 0}\n`;

        if (checklist.actionPlans?.length > 0) {
            checklist.actionPlans.forEach((p, i) => {
                output += `  ${i + 1}. ${p.title} (ID: ${p.id})\n`;
            });
        }

        if (checklist.parent) {
            output += `\nParent ActionPlans: ${checklist.parent.actionPlans?.length || 0}\n`;
            if (checklist.parent.actionPlans?.length > 0) {
                checklist.parent.actionPlans.forEach((p, i) => {
                    output += `  ${i + 1}. ${p.title} (ID: ${p.id})\n`;
                });
            }
        }
    }

    // Check all action plans for this checklist
    output += '\n=== ALL ACTION PLANS ===\n';
    const allPlans = await prisma.actionPlan.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    allPlans.forEach(p => {
        output += `ChecklistId: ${p.checklistId} | Title: ${p.title} | Created: ${p.createdAt.toISOString()}\n`;
    });

    fs.writeFileSync('scripts/db-check-output.txt', output);
    console.log('Done');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
