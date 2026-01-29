const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const options = await prisma.databaseOption.findMany({
        orderBy: [{ source: 'asc' }, { label: 'asc' }],
    });

    // Write to file
    fs.writeFileSync('current-options.json', JSON.stringify(options, null, 2));
    console.log(`Found ${options.length} options. Saved to current-options.json`);

    // Print summary by source
    const bySource = {};
    options.forEach(opt => {
        bySource[opt.source] = (bySource[opt.source] || 0) + 1;
    });
    console.log('Options by source:');
    Object.entries(bySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
    });

    await prisma.$disconnect();
}

main();
