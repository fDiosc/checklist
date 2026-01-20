import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get all sections that have 'Produto' items
    const sections = await prisma.section.findMany({
        where: {
            items: {
                some: { name: 'Produto' }
            }
        },
        include: {
            items: {
                orderBy: { order: 'asc' }
            },
            template: true
        }
    });

    console.log('=== REORDENANDO ITENS ===\n');

    for (const section of sections) {
        console.log(`Template: ${section.template.name}`);
        console.log('  Antes:');
        section.items.forEach((item, i) => {
            console.log(`    ${i + 1}. ${item.name} (order: ${item.order})`);
        });

        // Separate items into groups
        const variedade = section.items.filter(i => i.name === 'Variedade');
        const area = section.items.filter(i => i.name.includes('Área') || i.name.includes('Area'));
        const produtos = section.items.filter(i => i.name === 'Produto');
        const volumeCalda = section.items.filter(i => i.name.includes('Volume'));
        const dataUso = section.items.filter(i => i.name.includes('Data'));
        const outros = section.items.filter(i =>
            !i.name.includes('Variedade') &&
            !i.name.includes('Área') &&
            !i.name.includes('Area') &&
            i.name !== 'Produto' &&
            !i.name.includes('Volume') &&
            !i.name.includes('Data')
        );

        // New order: Variedade -> Área -> Produto x3 -> Volume -> Data -> Outros
        const newOrder = [...variedade, ...area, ...produtos, ...volumeCalda, ...dataUso, ...outros];

        // Update order in database
        for (let i = 0; i < newOrder.length; i++) {
            await prisma.item.update({
                where: { id: newOrder[i].id },
                data: { order: i }
            });
        }

        console.log('  Depois:');
        newOrder.forEach((item, i) => {
            console.log(`    ${i + 1}. ${item.name}`);
        });
        console.log('');
    }

    console.log('=== CONCLUÍDO ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
