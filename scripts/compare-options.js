const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Mapping of user-provided "Uso" to database source
const sourceMapping = {
    'Fertilizante Solo': 'fertilizers_soil',
    'Tratamento Sementes': 'seed_treatment',
    'Dessecação Pré Plantio': 'desiccation_pre_planting',
    'Pré Emergente Plante Aplique': 'pre_emergent_planting',
    'Pós Emergente Folhas Estreitas': 'post_emergent_narrow_leaves',
    'Pós Emergente Folhas Largas': 'post_emergent_broad_leaves',
    'Controle de Insetos': 'insect_control',
    'Manejo de Doenças': 'disease_management',
    'Nutrição Foliar': 'foliar_nutrition',
    'Dessecação Pré Colheita': 'desiccation_pre_harvest',
};

// Items from user's list
const userItems = [
    { uso: 'Fertilizante Solo', produto: 'Boro Ulexita', composicao: 'B2O3 43%' },
    { uso: 'Fertilizante Solo', produto: 'Algen Lithothamnium', composicao: 'Ca 34% Ma3% a.a.5%' },
    { uso: 'Fertilizante Solo', produto: 'KCl', composicao: 'K2O 60%' },
    { uso: 'Fertilizante Solo', produto: 'Aspire', composicao: 'N 00% - P 00% - K 58% - B 0,5' },
    { uso: 'Fertilizante Solo', produto: 'NPK 00-20-20', composicao: 'N 00% - P 20% - K 20%' },
    { uso: 'Fertilizante Solo', produto: 'MAP', composicao: 'N 11%-P 52%-K 00%' },
    { uso: 'Fertilizante Solo', produto: 'NPK 18-00-18', composicao: 'N 18%-P 00%-K 18%' },
    { uso: 'Fertilizante Solo', produto: 'Sulfato de Amônio', composicao: 'N 20%-P 00%-K 00% - S 22%' },
    { uso: 'Fertilizante Solo', produto: 'NPK 20-00-20', composicao: 'N 20%-P 00%-K 20%' },
    { uso: 'Fertilizante Solo', produto: 'Novatec Solub 45', composicao: 'N 45%' },
    { uso: 'Fertilizante Solo', produto: 'Uréia', composicao: 'N 45%' },
    { uso: 'Fertilizante Solo', produto: 'Athos Mosaic', composicao: 'NPK 03 32 08 + 0,2 Zn + 0,1 B' },
    { uso: 'Fertilizante Solo', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Fertilizante Solo', produto: 'Superfosfato Simples', composicao: 'P2O5 20%-S 10%' },
    { uso: 'Fertilizante Solo', produto: 'Superfosfato Triplo', composicao: 'P2O5 45%-Ca 10%' },
    { uso: 'Fertilizante Solo', produto: 'Enxofre', composicao: '' },
    { uso: 'Fertilizante Solo', produto: 'Manganês', composicao: '' },
    { uso: 'Fertilizante Solo', produto: 'Níquel', composicao: '' },
    { uso: 'Fertilizante Solo', produto: 'Zinco', composicao: '' },
    { uso: 'Tratamento Sementes', produto: 'Promov NiCoMo (TS)', composicao: 'aa 6% - B 0,5% - Co 1% - K2O 1% - Mn 0,5% - Mg 1% - Mo 4,6% - Ni 0,4% - P2O5 2% - Zn 2%' },
    { uso: 'Tratamento Sementes', produto: 'Fipronil Genérico 250 FS', composicao: 'Fipronil 250 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Shelter', composicao: 'Fipronil 250 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Standak', composicao: 'Fipronil 250 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Standak Top', composicao: 'Fipronil 250 g/l + Tiofanato Metílico 225 g/l + Piraclostrobina 25 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Gaucho FS 600', composicao: 'Imidacloprid 600 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Imidacloprid FS 600 Genérico', composicao: 'Imidacloprid 600 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Up Seeds', composicao: 'Mo 9% - Ni 0,9% - Co 0,45% - K2O 2,3% - polimero' },
    { uso: 'Tratamento Sementes', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Tratamento Sementes', produto: 'Simplex', composicao: 'Simplex' },
    { uso: 'Tratamento Sementes', produto: 'Stimulate', composicao: 'Stimulate' },
    { uso: 'Tratamento Sementes', produto: 'Aprove', composicao: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Certeza N', composicao: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Firmeza N', composicao: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l' },
    { uso: 'Tratamento Sementes', produto: 'Plust', composicao: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Glifosato 480 SL Genérico Líquido', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Glifosato Nortox 480 SL', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Roundup Original', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Roundup Original Mais', composicao: 'Glifosato 480 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Roundup Transorb', composicao: 'Glifosato 480 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Glifosato Genérico 500 Líquido', composicao: 'Glifosato 500 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Zapp QI Líquido', composicao: 'Glifosato 500 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Crucial 698 Sumitomo', composicao: 'Glifosato 540 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Glifosato Genérico WG 720', composicao: 'Glifosato 720 g/kg' },
    { uso: 'Dessecação Pré Plantio', produto: 'Roundup WG 720', composicao: 'Glifosato 720 g/kg' },
    { uso: 'Dessecação Pré Plantio', produto: 'Connor 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Finale 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Glufosinato Genérico 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Liberty 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Lifeline 280 SL', composicao: 'Glufosinato 280 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Trunfo 280 SL', composicao: 'Glufosinato 280 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Dessecação Pré Plantio', produto: 'Dual Gold 960 EC', composicao: 'S Metolachlor 960 g/l' },
    { uso: 'Dessecação Pré Plantio', produto: 'S Metolachlor Genérico', composicao: 'S Metolachlor 960 g/l' },
    { uso: 'Pré Emergente Plante Aplique', produto: 'Plateau', composicao: 'Imazapic 700 g/kg' },
    { uso: 'Pré Emergente Plante Aplique', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Pré Emergente Plante Aplique', produto: 'Dual Gold 960 EC', composicao: 'S Metolachlor 960 g/l' },
    { uso: 'Pré Emergente Plante Aplique', produto: 'S Metolachlor Genérico', composicao: 'S Metolachlor 960 g/l' },
    { uso: 'Pós Emergente Folhas Estreitas', produto: 'Cletodim Genérico', composicao: 'Cletodim 240 g/l' },
    { uso: 'Pós Emergente Folhas Estreitas', produto: 'Poquer', composicao: 'Cletodim 240 g/l' },
    { uso: 'Pós Emergente Folhas Estreitas', produto: 'Select', composicao: 'Cletodim 240 g/l' },
    { uso: 'Pós Emergente Folhas Estreitas', produto: 'Verdict R', composicao: 'Haloxifope 124,7 g/l' },
    { uso: 'Pós Emergente Folhas Estreitas', produto: 'Verdict Max', composicao: 'Haloxifope 540 g/l' },
    { uso: 'Pós Emergente Folhas Largas', produto: 'Vezir', composicao: 'Imazetapir 106 g/l' },
    { uso: 'Pós Emergente Folhas Largas', produto: 'Zephir', composicao: 'Imazetapir 106 g/l' },
    { uso: 'Pós Emergente Folhas Largas', produto: 'Imazetapir Nortox', composicao: 'Imazetapir 212 g/l' },
    { uso: 'Pós Emergente Folhas Largas', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Controle de Insetos', produto: 'Acefato CCAB 750 SP', composicao: 'Acefato 750 g/kg' },
    { uso: 'Controle de Insetos', produto: 'Acefato Nortox', composicao: 'Acefato 750 g/kg' },
    { uso: 'Controle de Insetos', produto: 'Feroce', composicao: 'Acefato 850 g/kg + Bifentrina 30 g/kg' },
    { uso: 'Controle de Insetos', produto: 'Magnum', composicao: 'Acefato 970 g/kg' },
    { uso: 'Controle de Insetos', produto: 'Perito 970 SG', composicao: 'Acefato 970 g/kg' },
    { uso: 'Controle de Insetos', produto: 'Bifentrina 100 EC Nortox', composicao: 'Bifentrina 100 g/l' },
    { uso: 'Controle de Insetos', produto: 'Bifentrina CCAB 100 EC', composicao: 'Bifentrina 100 g/l' },
    { uso: 'Controle de Insetos', produto: 'Talstar 400 EC', composicao: 'Bifentrina 400 g/l' },
    { uso: 'Controle de Insetos', produto: 'Valente', composicao: 'Extrato de Neem' },
    { uso: 'Controle de Insetos', produto: 'Galil SC', composicao: 'Imidacloprid 250 g/l + Bifentrina 50 g/l' },
    { uso: 'Controle de Insetos', produto: 'Karate Zeon 250 CS', composicao: 'Lambda-cialotrina 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Lambda-cialotrina Genérica', composicao: 'Lambda-cialotrina 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Lufenuron Genérico', composicao: 'Lufenuron 50 g/l' },
    { uso: 'Controle de Insetos', produto: 'Match EC', composicao: 'Lufenuron 50 g/l' },
    { uso: 'Controle de Insetos', produto: 'Lannate BR', composicao: 'Metomil 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Methomex 215 SL', composicao: 'Metomil 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Metomil 215 SL Nortox', composicao: 'Metomil 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Metomil Genérico 215 SL', composicao: 'Metomil 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Metomy', composicao: 'Metomil 250 g/l' },
    { uso: 'Controle de Insetos', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Controle de Insetos', produto: 'Engeo Pleno S', composicao: 'Tiametoxam 141 g/l + Lambad-cialotrina 106 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Avanço', composicao: '(Beauveria bassiana cepa66; Metarhizium anisopliae. cepa425). 1x10^7 + micotoxinas' },
    { uso: 'Manejo de Doenças', produto: 'Orbital', composicao: '(Mix de 5 Bacillus spp. 1x10^10)' },
    { uso: 'Manejo de Doenças', produto: 'Sfinge', composicao: '(Trichoderma harz. 1x10^7 + enzimas)' },
    { uso: 'Manejo de Doenças', produto: 'Defender', composicao: 'Bacillus subtilis, Bacillus pumilus e Bacillus velezensis;(1x10^10+Pool enzimatico)' },
    { uso: 'Manejo de Doenças', produto: 'Bravonil 500 SC', composicao: 'Clorotalonil 500 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Clorotalonil Genérico 500 SC', composicao: 'Clorotalonil 500 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Bravonil Top', composicao: 'Clorotalonil 500 g/l + Difenoconazol 50 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Miravis Duo', composicao: 'Difenoconazol 125 g/l + Pidiflumetofem 75 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Difenoconazol Genérico', composicao: 'Difenoconazol 250 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Score', composicao: 'Difenoconazol 250 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Score Flexi', composicao: 'Difenoconazol 250 g/l + Propiconazol 250 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Orkestra', composicao: 'Fluxapiroxade 133 g/l + Piraclostrobina 333 g/l' },
    { uso: 'Manejo de Doenças', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Manejo de Doenças', produto: 'Mob Reforce', composicao: 'Peróxidos orgânicos IP6%' },
    { uso: 'Nutrição Foliar', produto: 'Esplendido', composicao: 'B 0,2% - Co 0,3% - Mn 2% - Mg 4% - Mo 3% - N 5%' },
    { uso: 'Nutrição Foliar', produto: 'Detox Bor', composicao: 'B 10%' },
    { uso: 'Nutrição Foliar', produto: 'Dominio', composicao: 'Bioestimulante' },
    { uso: 'Nutrição Foliar', produto: 'Borum', composicao: 'Boro 100 g/l' },
    { uso: 'Nutrição Foliar', produto: 'Co-Mo', composicao: 'Co-Mo' },
    { uso: 'Nutrição Foliar', produto: 'Manganês', composicao: 'Manganês' },
    { uso: 'Nutrição Foliar', produto: 'Nitro Mag', composicao: 'Mg 6% - N 6%' },
    { uso: 'Nutrição Foliar', produto: 'Níquel', composicao: 'Níquel' },
    { uso: 'Nutrição Foliar', produto: 'BoroTop', composicao: 'Octaborato Sódio 20,5%B' },
    { uso: 'Nutrição Foliar', produto: 'Outro', composicao: 'Outro' },
    { uso: 'Nutrição Foliar', produto: 'Sublime', composicao: 'K2O 25% - S 17%' },
    { uso: 'Nutrição Foliar', produto: 'Exnitro', composicao: 'N 30%' },
    { uso: 'Nutrição Foliar', produto: 'Starter Mn Platinium', composicao: '5% N; 4% S; 0,3% B; 0,3% Cu; 5% Mn; 0,05% Mo; 3% Zn' },
    { uso: 'Nutrição Foliar', produto: 'ProfolExclusive', composicao: 'N 10% -K2O 3% -  S  9,4% - Mg 1,0% - B 2% - Cu 0,1%  - Mn 6,5%-  Zn 9%' },
    { uso: 'Nutrição Foliar', produto: 'Profol Produtividade', composicao: 'K2O 10% - S 12,3% - Mg 1,5% - B 1,5% - Cu 0,5% - Mn 14% - Zn 4,5%' },
    { uso: 'Nutrição Foliar', produto: 'Speed', composicao: 'K2O 10% - S 12,4% - Mg 1,8% - B 1,5% - Cu 0,25% - Mn 14%- Zn 5%' },
    { uso: 'Nutrição Foliar', produto: 'Borotop', composicao: 'B 20%' },
    { uso: 'Nutrição Foliar', produto: 'Hormonal Grão Forte', composicao: '' },
    { uso: 'Dessecação Pré Colheita', produto: 'Diquat CCAB 200 SL', composicao: 'Diquat 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Diquat Genérico 200 SL', composicao: 'Diquat 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Diquat Nortox', composicao: 'Diquat 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Reglone', composicao: 'Diquat 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Glifosato 480 SL Genérico Líquido', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Glifosato Nortox 480 SL', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Roundup Original', composicao: 'Glifosato 360 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Roundup Original Mais', composicao: 'Glifosato 480 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Roundup Transorb', composicao: 'Glifosato 480 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Glifosato Genérico 500 Líquido', composicao: 'Glifosato 500 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Zapp QI Líquido', composicao: 'Glifosato 500 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Crucial 698 Sumitomo', composicao: 'Glifosato 540 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Glifosato Genérico WG 720', composicao: 'Glifosato 720 g/kg' },
    { uso: 'Dessecação Pré Colheita', produto: 'Roundup WG 720', composicao: 'Glifosato 720 g/kg' },
    { uso: 'Dessecação Pré Colheita', produto: 'Connor 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Finale 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Glufosinato Genérico 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Liberty 200 SL', composicao: 'Glufosinato 200 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Lifeline 280 SL', composicao: 'Glufosinato 280 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Trunfo 280 SL', composicao: 'Glufosinato 280 g/l' },
    { uso: 'Dessecação Pré Colheita', produto: 'Outro', composicao: 'Outro' },
];

async function main() {
    const existingOptions = await prisma.databaseOption.findMany();

    // Create a lookup of existing items by source+label (normalized)
    const existingSet = new Set();
    existingOptions.forEach(opt => {
        const key = `${opt.source}::${opt.label.trim().toLowerCase()}`;
        existingSet.add(key);
    });

    const missing = [];
    const duplicates = [];

    userItems.forEach(item => {
        const source = sourceMapping[item.uso];
        if (!source) {
            console.warn(`Unknown uso: ${item.uso}`);
            return;
        }

        const key = `${source}::${item.produto.trim().toLowerCase()}`;

        if (existingSet.has(key)) {
            duplicates.push({ ...item, source });
        } else {
            missing.push({ ...item, source });
        }
    });

    console.log('\n=== ANÁLISE COMPLETA ===\n');
    console.log(`Total de itens na lista do usuário: ${userItems.length}`);
    console.log(`Itens já existentes no banco: ${duplicates.length}`);
    console.log(`Itens FALTANDO no banco: ${missing.length}`);

    console.log('\n=== ITENS FALTANDO ===\n');

    // Group by source
    const bySource = {};
    missing.forEach(item => {
        if (!bySource[item.source]) bySource[item.source] = [];
        bySource[item.source].push(item);
    });

    Object.entries(bySource).forEach(([source, items]) => {
        console.log(`\n[${source}] - ${items.length} itens:`);
        items.forEach(item => {
            console.log(`  - ${item.produto} | ${item.composicao || '(sem composição)'}`);
        });
    });

    // Save missing items for insertion
    fs.writeFileSync('missing-options.json', JSON.stringify(missing, null, 2));
    console.log('\n\nArquivo missing-options.json criado com os itens a serem inseridos.');

    await prisma.$disconnect();
}

main();
