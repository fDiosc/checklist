const { PrismaClient } = require('@prisma/client');

// Connect to PRODUCTION database
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_XEtNw49dlpUf@ep-green-poetry-ahc167wr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
        }
    }
});

async function main() {
    console.log('Verificando banco de PRODUÇÃO...\n');

    const options = await prisma.databaseOption.findMany({
        orderBy: [{ source: 'asc' }, { label: 'asc' }]
    });

    console.log(`Total de itens no banco PRODUÇÃO: ${options.length}\n`);

    // Group by source
    const bySource = {};
    options.forEach(opt => {
        if (!bySource[opt.source]) bySource[opt.source] = [];
        bySource[opt.source].push(opt.label);
    });

    console.log('Distribuição por categoria:');
    Object.entries(bySource).sort((a, b) => a[0].localeCompare(b[0])).forEach(([source, items]) => {
        console.log(`  ${source}: ${items.length} itens`);
    });

    await prisma.$disconnect();
}

main();
