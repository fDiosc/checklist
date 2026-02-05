const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const producer = await prisma.producer.findFirst({
        where: { name: { contains: 'Maradona' } },
        include: {
            identifiers: true,
            agriculturalRegistry: true
        }
    });
    
    console.log('=== Producer Data ===');
    console.log(JSON.stringify(producer, null, 2));
    
    console.log('\n=== Identifiers Structure ===');
    if (producer?.identifiers) {
        producer.identifiers.forEach(id => {
            console.log(`  - category: ${id.category}, idType: ${id.idType}, idValue: ${id.idValue}`);
        });
    } else {
        console.log('  No identifiers found');
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
