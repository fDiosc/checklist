
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration for each new template
const templatesToCreate = [
    {
        name: 'Pré Emergente Plante Aplique',
        folder: 'Pré Plantio',
        products: [
            { source: 'pre_emergent_planting', label: 'Pré Emergente 1' },
            { source: 'pre_emergent_planting', label: 'Pré Emergente 2' },
            { source: 'pre_emergent_planting', label: 'Pré Emergente 3' }
        ]
    },
    {
        name: 'Pós Emergente Folhas Estreitas',
        folder: 'Pós Plantio',
        products: [
            { source: 'post_emergent_narrow_leaves', label: 'Herbicida 1' },
            { source: 'post_emergent_narrow_leaves', label: 'Herbicida 2' },
            { source: 'post_emergent_narrow_leaves', label: 'Herbicida 3' }
        ]
    },
    {
        name: 'Pós Emergente Folhas Largas',
        folder: 'Pós Plantio',
        products: [
            { source: 'post_emergent_broad_leaves', label: 'Herbicida 1' },
            { source: 'post_emergent_broad_leaves', label: 'Herbicida 2' },
            { source: 'post_emergent_broad_leaves', label: 'Herbicida 3' }
        ]
    },
    {
        name: 'Controle de Insetos',
        folder: 'Manejo',
        products: [
            { source: 'insect_control', label: 'Inseticida 1' },
            { source: 'insect_control', label: 'Inseticida 2' },
            { source: 'insect_control', label: 'Inseticida 3' }
        ]
    },
    {
        name: 'Manejo de Doenças 1',
        folder: 'Manejo',
        products: [
            { source: 'disease_management', label: 'Fungicida 1' },
            { source: 'disease_management', label: 'Fungicida 2' },
            { source: 'disease_management', label: 'Fungicida 3' }
        ]
    },
    {
        name: 'Manejo de Doenças 2',
        folder: 'Manejo',
        products: [
            { source: 'disease_management', label: 'Fungicida 1' },
            { source: 'disease_management', label: 'Fungicida 2' },
            { source: 'disease_management', label: 'Fungicida 3' }
        ]
    },
    {
        name: 'Nutrição Foliar',
        folder: 'Nutrição',
        products: [
            { source: 'foliar_nutrition', label: 'Nutriente 1' },
            { source: 'foliar_nutrition', label: 'Nutriente 2' },
            { source: 'foliar_nutrition', label: 'Nutriente 3' }
        ]
    },
    {
        name: 'Dessecação Pré Colheita',
        folder: 'Colheita',
        products: [
            { source: 'desiccation_pre_harvest', label: 'Dessecante 1' },
            { source: 'desiccation_pre_harvest', label: 'Dessecante 2' },
            { source: 'desiccation_pre_harvest', label: 'Dessecante 3' }
        ]
    },
    {
        name: 'Tratamento de Sementes',
        folder: 'Pré Plantio',
        products: [
            { source: 'seed_treatment', label: 'Tratamento 1' },
            { source: 'seed_treatment', label: 'Tratamento 2' },
            { source: 'seed_treatment', label: 'Tratamento 3' }
        ]
    }
];

const BASE_TEMPLATE_ID = 'cmkvmzz63006mdgzkmjdm4e7c';

async function main() {
    console.log('Fetching base template...');
    const baseTemplate = await prisma.template.findUnique({
        where: { id: BASE_TEMPLATE_ID },
        include: {
            sections: {
                orderBy: { order: 'asc' },
                include: {
                    items: {
                        orderBy: { order: 'asc' }
                    }
                }
            }
        }
    });

    if (!baseTemplate) {
        console.error('Base template not found!');
        return;
    }

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const creatorId = adminUser ? adminUser.id : baseTemplate.createdById;

    for (const config of templatesToCreate) {
        console.log(`Creating template: ${config.name}...`);

        // Create Template
        const newTemplate = await prisma.template.create({
            data: {
                name: config.name,
                folder: config.folder,
                requiresProducerIdentification: baseTemplate.requiresProducerIdentification,
                isContinuous: baseTemplate.isContinuous,
                actionPlanPromptId: baseTemplate.actionPlanPromptId,
                createdById: creatorId,
            }
        });

        // Replicate Sections
        for (const section of baseTemplate.sections) {
            const newSection = await prisma.section.create({
                data: {
                    templateId: newTemplate.id,
                    name: section.name,
                    order: section.order,
                    iterateOverFields: section.iterateOverFields
                }
            });

            // Replicate Items
            // We need to verify if this section contains the "Product" items to replace
            // Assumption: The base template has items where we need to inject the specific products.
            // Let's assume the base template has 3 items for products (Produto 1, Produto 2, Produto 3)
            // or we just blindly copy everything but replace specific item TYPES or NAMES if they match a pattern?
            // "Preciso criar basicamente um checklist igual, mudando apenas os 3 campos produto"

            // Getting index of items that look like "Produto"
            let productCounter = 0;

            for (const item of section.items) {
                let newItemData = {
                    sectionId: newSection.id,
                    name: item.name,
                    type: item.type,
                    order: item.order,
                    required: item.required,
                    validityControl: item.validityControl,
                    observationEnabled: item.observationEnabled,
                    requestArtifact: item.requestArtifact,
                    artifactRequired: item.artifactRequired,
                    askForQuantity: item.askForQuantity,
                    options: item.options,
                    databaseSource: item.databaseSource
                };

                // Logic to replace Product fields
                // If the item name contains "Produto" or "Defensivo" or uses a database source, 
                // we might want to swap it with our config products.
                // Or simpler: The user said "changing ONLY the 3 product fields". 
                // Let's assume the items are ordered and we just replace the ones that are DB lookups?

                if (item.type === 'DROPDOWN_SELECT' && item.databaseSource) {
                    // This is likely a product field
                    if (productCounter < config.products.length) {
                        const productConfig = config.products[productCounter];
                        newItemData.name = productConfig.label; // e.g., "Pré Emergente 1"
                        newItemData.databaseSource = productConfig.source;
                        productCounter++;
                    }
                }

                await prisma.item.create({ data: newItemData });
            }
        }
    }

    console.log('All templates created successfully!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
