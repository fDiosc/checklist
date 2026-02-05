const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking Database State ===\n');
    
    // Check producers
    const producers = await prisma.producer.findMany({
        select: {
            id: true,
            name: true,
            countryCode: true,
            cpf: true
        },
        take: 10
    });
    
    console.log('Producers (first 10):');
    producers.forEach(p => {
        console.log(`  - ${p.name}: countryCode=${p.countryCode}, cpf=${p.cpf?.slice(0,3)}...`);
    });
    
    // Check if new tables exist
    try {
        const identifiers = await prisma.producerIdentifier.count();
        console.log(`\nProducerIdentifiers count: ${identifiers}`);
    } catch (e) {
        console.log('\nProducerIdentifiers table does not exist:', e.message);
    }
    
    try {
        const registries = await prisma.agriculturalRegistry.count();
        console.log(`AgriculturalRegistries count: ${registries}`);
    } catch (e) {
        console.log('AgriculturalRegistries table does not exist:', e.message);
    }
    
    // Check PropertyMap for new columns
    const propertyMaps = await prisma.propertyMap.findMany({
        select: {
            id: true,
            countryCode: true,
            sourceType: true,
            name: true
        },
        take: 5
    });
    
    console.log('\nPropertyMaps (first 5):');
    propertyMaps.forEach(m => {
        console.log(`  - ${m.id.slice(0,8)}...: countryCode=${m.countryCode}, sourceType=${m.sourceType}, name=${m.name}`);
    });
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
