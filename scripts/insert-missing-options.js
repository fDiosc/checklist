const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Function to create value from label
function createValue(label) {
    return label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}

// Default units per source
const defaultUnits = {
    'fertilizers_soil': 'kg/ha',
    'seed_treatment': 'ml/kg semente',
    'desiccation_pre_planting': 'l/ha',
    'pre_emergent_planting': 'l/ha',
    'disease_management': 'l/ha',
    'foliar_nutrition': 'l/ha',
    'desiccation_pre_harvest': 'l/ha',
    'insect_control': 'l/ha',
    'post_emergent_narrow_leaves': 'l/ha',
    'post_emergent_broad_leaves': 'l/ha',
};

async function main() {
    // Read missing items
    const missing = JSON.parse(fs.readFileSync('missing-options.json', 'utf-8'));

    console.log(`\nInserindo ${missing.length} itens no banco de dados...\n`);

    let inserted = 0;

    for (const item of missing) {
        const value = createValue(item.produto);
        const unit = defaultUnits[item.source] || '';

        try {
            await prisma.databaseOption.create({
                data: {
                    source: item.source,
                    label: item.produto.trim(),
                    value: value,
                    composition: item.composicao || null,
                    unit: unit,
                }
            });
            console.log(`✅ Inserido: [${item.source}] ${item.produto}`);
            inserted++;
        } catch (error) {
            console.error(`❌ Erro ao inserir ${item.produto}: ${error.message}`);
        }
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Total inseridos: ${inserted}/${missing.length}`);

    await prisma.$disconnect();
}

main();
