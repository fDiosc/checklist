const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_ID = 'user_37ykQupXw5I82G2ndgZl5hpJlcp';

const templatesData = [
    {
        name: 'Adubação',
        folder: 'Produção',
        sections: [
            {
                name: 'Dados da Adubação',
                iterateOverFields: true,
                items: [
                    { name: 'Variedade', type: 'DROPDOWN_SELECT', databaseSource: 'seed_variety' },
                    { name: 'Área (ha)', type: 'TEXT' },
                    { name: 'Uso', type: 'TEXT' },
                    { name: 'Produto', type: 'DROPDOWN_SELECT', databaseSource: 'fertilizers_soil' },
                    { name: 'Composição', type: 'TEXT', observationEnabled: true }, // Using observation as info or just text
                    { name: 'Dose', type: 'TEXT', askForQuantity: true },
                    { name: 'Unidade de Dose', type: 'TEXT' },
                    { name: 'Volume Calda l/ha', type: 'TEXT' },
                    { name: 'Data de Uso', type: 'DATE' }
                ]
            }
        ]
    },
    {
        name: 'Tratamento de Sementes',
        folder: 'Sementes',
        sections: [
            {
                name: 'Dados do Tratamento de Sementes',
                iterateOverFields: true,
                items: [
                    { name: 'Variedade', type: 'DROPDOWN_SELECT', databaseSource: 'seed_variety' },
                    { name: 'Área (ha)', type: 'TEXT' },
                    { name: 'Uso', type: 'TEXT' },
                    { name: 'Produto', type: 'DROPDOWN_SELECT', databaseSource: 'seed_treatment' },
                    { name: 'Composição', type: 'TEXT' },
                    { name: 'Dose', type: 'TEXT', askForQuantity: true },
                    { name: 'Unidade de Dose', type: 'TEXT' },
                    { name: 'Volume Calda l/ha', type: 'TEXT' },
                    { name: 'Data de Uso', type: 'DATE' }
                ]
            }
        ]
    },
    {
        name: 'Operação de Plantio',
        folder: 'Operação',
        sections: [
            {
                name: 'Dados do Plantio',
                iterateOverFields: true,
                items: [
                    { name: 'Variedade', type: 'DROPDOWN_SELECT', databaseSource: 'seed_variety' },
                    { name: 'Área (ha)', type: 'TEXT' },
                    { name: 'Data do plantio', type: 'DATE' },
                    { name: 'Plantadeira a vácuo', type: 'SINGLE_CHOICE', options: ['Sim', 'Não'] },
                    { name: 'Modelo Aprovado?', type: 'SINGLE_CHOICE', options: ['Sim', 'Não'] },
                    { name: 'Disco de Plantio', type: 'SINGLE_CHOICE', options: ['0,8mm', '1,0mm', '2,0mm'] }
                ]
            }
        ]
    },
    {
        name: 'Dessecação Pré Plantio',
        folder: 'Produção',
        sections: [
            {
                name: 'Dados da Dessecação',
                iterateOverFields: true,
                items: [
                    { name: 'Variedade', type: 'DROPDOWN_SELECT', databaseSource: 'seed_variety' },
                    { name: 'Área (ha)', type: 'TEXT' },
                    { name: 'Uso', type: 'TEXT' },
                    { name: 'Produto', type: 'DROPDOWN_SELECT', databaseSource: 'desiccation_pre_planting' },
                    { name: 'Composição', type: 'TEXT' },
                    { name: 'Dose', type: 'TEXT', askForQuantity: true },
                    { name: 'Unidade de Dose', type: 'TEXT' },
                    { name: 'Volume Calda l/ha', type: 'TEXT' },
                    { name: 'Data de Uso', type: 'DATE' }
                ]
            }
        ]
    },
    {
        name: 'Plante e Aplique',
        folder: 'Produção',
        sections: [
            {
                name: 'Dados Plante e Aplique',
                iterateOverFields: true,
                items: [
                    { name: 'Variedade', type: 'DROPDOWN_SELECT', databaseSource: 'seed_variety' },
                    { name: 'Área (ha)', type: 'TEXT' },
                    { name: 'Uso', type: 'TEXT' },
                    { name: 'Produto', type: 'DROPDOWN_SELECT', databaseSource: 'pre_emergent_planting' },
                    { name: 'Composição', type: 'TEXT' },
                    { name: 'Dose', type: 'TEXT', askForQuantity: true },
                    { name: 'Unidade de Dose', type: 'TEXT' },
                    { name: 'Volume Calda l/ha', type: 'TEXT' },
                    { name: 'Data de Uso', type: 'DATE' }
                ]
            }
        ]
    }
];

async function main() {
    console.log('Creating templates...');

    for (const tData of templatesData) {
        console.log(`- Creating template: ${tData.name}`);
        const template = await prisma.template.create({
            data: {
                name: tData.name,
                folder: tData.folder,
                createdById: ADMIN_ID,
                sections: {
                    create: tData.sections.map((s, sIdx) => ({
                        name: s.name,
                        order: sIdx,
                        iterateOverFields: s.iterateOverFields,
                        items: {
                            create: s.items.map((i, iIdx) => ({
                                name: i.name,
                                type: i.type,
                                order: iIdx,
                                databaseSource: i.databaseSource || null,
                                options: i.options || [],
                                askForQuantity: i.askForQuantity || false
                            }))
                        }
                    }))
                }
            }
        });
        console.log(`  Done: ${template.id}`);
    }

    console.log('All agricultural templates created successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
