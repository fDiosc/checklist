
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const options = [
    // Fertilizante Solo
    { source: 'fertilizers_soil', label: 'Boro Ulexita', value: 'boro_ulexita', composition: 'B2O3 43%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'KCl', value: 'kcl', composition: 'K2O 60%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'MAP', value: 'map', composition: 'N 11%-P 52%-K 00%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'NPK 18-00-18', value: 'npk_18_00_18', composition: 'N 18%-P 00%-K 18%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'NPK 20-00-20', value: 'npk_20_00_20', composition: 'N 20%-P 00%-K 20%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Uréia', value: 'ureia', composition: 'N 45%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Superfosfato Simples', value: 'superfosfato_simples', composition: 'P2O5 20%-S 10%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Superfosfato Triplo', value: 'superfosfato_triplo', composition: 'P2O5 45%-Ca 10%', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Enxofre', value: 'enxofre', composition: '', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Manganês', value: 'manganez', composition: '', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Níquel', value: 'niquel', composition: '', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Zinco', value: 'zinco', composition: '', unit: 'kg/ha' },
    { source: 'fertilizers_soil', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Tratamento Sementes
    { source: 'seed_treatment', label: 'Fipronil Genérico 250 FS', value: 'fipronil_generico_250_fs', composition: 'Fipronil 250 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Shelter', value: 'shelter', composition: 'Fipronil 250 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Standak', value: 'standak', composition: 'Fipronil 250 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Standak Top', value: 'standak_top', composition: 'Fipronil 250 g/l + Tiofanato Metílico 225 g/l + Piraclostrobina 25 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Gaucho FS 600', value: 'gaucho_fs_600', composition: 'Imidacloprid 600 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Imidacloprid FS 600 Genérico', value: 'imidacloprid_fs_600_generico', composition: 'Imidacloprid 600 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Simplex', value: 'simplex', composition: 'Simplex', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Stimulate', value: 'stimulate', composition: 'Stimulate', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Aprove', value: 'aprove', composition: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Certeza N', value: 'certeza_n', composition: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Firmeza N', value: 'firmeza_n', composition: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Plust', value: 'plust', composition: 'Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l', unit: 'ml/kg semente' },
    { source: 'seed_treatment', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Dessecação Pré Plantio
    { source: 'desiccation_pre_planting', label: 'Glifosato 480 SL Genérico Líquido', value: 'glifosato_480_sl_generico_liquido', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Glifosato Nortox 480 SL', value: 'glifosato_nortox_480_sl', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Roundup Original', value: 'roundup_original', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Roundup Original Mais', value: 'roundup_original_mais', composition: 'Glifosato 480 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Roundup Transorb', value: 'roundup_transorb', composition: 'Glifosato 480 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Glifosato Genérico 500 Líquido', value: 'glifosato_generico_500_liquido', composition: 'Glifosato 500 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Zapp QI Líquido', value: 'zapp_qi_liquido', composition: 'Glifosato 500 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Crucial 698 Sumitomo', value: 'crucial_698_sumitomo', composition: 'Glifosato 540 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Glifosato Genérico WG 720', value: 'glifosato_generico_wg_720', composition: 'Glifosato 720 g/kg', unit: 'kg/ha' },
    { source: 'desiccation_pre_planting', label: 'Roundup WG 720', value: 'roundup_wg_720', composition: 'Glifosato 720 g/kg', unit: 'kg/ha' },
    { source: 'desiccation_pre_planting', label: 'Connor 200 SL', value: 'connor_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Finale 200 SL', value: 'finale_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Glufosinato Genérico 200 SL', value: 'glufosinato_generico_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Liberty 200 SL', value: 'liberty_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Lifeline 280 SL', value: 'lifeline_280_sl', composition: 'Glufosinato 280 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Trunfo 280 SL', value: 'trunfo_280_sl', composition: 'Glufosinato 280 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_planting', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Pré Emergente Plante Aplique
    { source: 'pre_emergent_planting', label: 'Plateau', value: 'plateau', composition: 'Imazapic 700 g/kg', unit: 'g/ha' },
    { source: 'pre_emergent_planting', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Pós Emergente Folhas Estreitas
    { source: 'post_emergent_narrow_leaves', label: 'Cletodim Genérico', value: 'cletodim_generico', composition: 'Cletodim 240 g/l', unit: 'l/ha' },
    { source: 'post_emergent_narrow_leaves', label: 'Poquer', value: 'poquer', composition: 'Cletodim 240 g/l', unit: 'l/ha' },
    { source: 'post_emergent_narrow_leaves', label: 'Select', value: 'select', composition: 'Cletodim 240 g/l', unit: 'l/ha' },
    { source: 'post_emergent_narrow_leaves', label: 'Verdict R', value: 'verdict_r', composition: 'Haloxifope 124,7 g/l', unit: 'l/ha' },
    { source: 'post_emergent_narrow_leaves', label: 'Verdict Max', value: 'verdict_max', composition: 'Haloxifope 540 g/l', unit: 'l/ha' },

    // Pós Emergente Folhas Largas
    { source: 'post_emergent_broad_leaves', label: 'Vezir', value: 'vezir', composition: 'Imazetapir 106 g/l', unit: 'l/ha' },
    { source: 'post_emergent_broad_leaves', label: 'Zephir', value: 'zephir', composition: 'Imazetapir 106 g/l', unit: 'l/ha' },
    { source: 'post_emergent_broad_leaves', label: 'Imazetapir Nortox', value: 'imazetapir_nortox', composition: 'Imazetapir 212 g/l', unit: 'l/ha' },
    { source: 'post_emergent_broad_leaves', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Controle de Insetos
    { source: 'insect_control', label: 'Acefato CCAB 750 SP', value: 'acefato_ccab_750_sp', composition: 'Acefato 750 g/kg', unit: 'kg/ha' },
    { source: 'insect_control', label: 'Acefato Nortox', value: 'acefato_nortox', composition: 'Acefato 750 g/kg', unit: 'kg/ha' },
    { source: 'insect_control', label: 'Feroce', value: 'feroce', composition: 'Acefato 850 g/kg + Bifentrina 30 g/kg', unit: 'l/ha' },
    { source: 'insect_control', label: 'Magnum', value: 'magnum', composition: 'Acefato 970 g/kg', unit: 'kg/ha' },
    { source: 'insect_control', label: 'Perito 970 SG', value: 'perito_970_sg', composition: 'Acefato 970 g/kg', unit: 'kg/ha' },
    { source: 'insect_control', label: 'Bifentrina 100 EC Nortox', value: 'bifentrina_100_ec_nortox', composition: 'Bifentrina 100 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Bifentrina CCAB 100 EC', value: 'bifentrina_ccab_100_ec', composition: 'Bifentrina 100 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Talstar 400 EC', value: 'talstar_400_ec', composition: 'Bifentrina 400 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Valente', value: 'valente', composition: 'Extrato de Neem', unit: 'l/ha' },
    { source: 'insect_control', label: 'Galil SC', value: 'galil_sc', composition: 'Imidacloprid 250 g/l + Bifentrina 50 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Karate Zeon 250 CS', value: 'karate_zeon_250_cs', composition: 'Lambda-cialotrina 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Lambda-cialotrina Genérica', value: 'lambda_cialotrina_generica', composition: 'Lambda-cialotrina 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Lufenuron Genérico', value: 'lufenuron_generico', composition: 'Lufenuron 50 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Match EC', value: 'match_ec', composition: 'Lufenuron 50 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Lannate BR', value: 'lannate_br', composition: 'Metomil 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Methomex 215 SL', value: 'methomex_215_sl', composition: 'Metomil 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Metomil 215 SL Nortox', value: 'metomil_215_sl_nortox', composition: 'Metomil 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Metomil Genérico 215 SL', value: 'metomil_generico_215_sl', composition: 'Metomil 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Metomy', value: 'metomy', composition: 'Metomil 250 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Engeo Pleno S', value: 'engeo_pleno_s', composition: 'Tiametoxam 141 g/l + Lambad-cialotrina 106 g/l', unit: 'l/ha' },
    { source: 'insect_control', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Manejo de Doenças
    { source: 'disease_management', label: 'Bravonil 500 SC', value: 'bravonil_500_sc', composition: 'Clorotalonil 500 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Clorotalonil Genérico 500 SC', value: 'clorotalonil_generico_500_sc', composition: 'Clorotalonil 500 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Bravonil Top', value: 'bravonil_top', composition: 'Clorotalonil 500 g/l + Difenoconazol 50 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Miravis Duo', value: 'miravis_duo', composition: 'Difenoconazol 125 g/l + Pidiflumetofem 75 g/l', unit: 'kg/ha' },
    { source: 'disease_management', label: 'Difenoconazol Genérico', value: 'difenoconazol_generico', composition: 'Difenoconazol 250 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Score', value: 'score', composition: 'Difenoconazol 250 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Score Flexi', value: 'score_flexi', composition: 'Difenoconazol 250 g/l + Propiconazol 250 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Orkestra', value: 'orkestra', composition: 'Fluxapiroxade 133 g/l + Piraclostrobina 333 g/l', unit: 'l/ha' },
    { source: 'disease_management', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },

    // Nutrição Foliar
    { source: 'foliar_nutrition', label: 'Dominio', value: 'dominio', composition: 'Bioestimulante', unit: 'l/ha' },
    { source: 'foliar_nutrition', label: 'Borum', value: 'borum', composition: 'Boro 100 g/l', unit: 'l/ha' },
    { source: 'foliar_nutrition', label: 'Co-Mo', value: 'co_mo', composition: 'Co-Mo', unit: 'l/ha' },
    { source: 'foliar_nutrition', label: 'Manganês', value: 'manganez', composition: 'Manganês', unit: 'l/ha' },
    { source: 'foliar_nutrition', label: 'Níquel', value: 'niquel', composition: 'Níquel', unit: 'l/ha' },
    { source: 'foliar_nutrition', label: 'Outro', value: 'outro', composition: 'Outro', unit: 'l/ha' },

    // Dessecação Pré Colheita
    { source: 'desiccation_pre_harvest', label: 'Diquat CCAB 200 SL', value: 'diquat_ccab_200_sl', composition: 'Diquat 200 g/l', unit: 'kg/ha' },
    { source: 'desiccation_pre_harvest', label: 'Diquat Genérico 200 SL', value: 'diquat_generico_200_sl', composition: 'Diquat 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Diquat Nortox', value: 'diquat_nortox', composition: 'Diquat 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Reglone', value: 'reglone', composition: 'Diquat 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Glifosato 480 SL Genérico Líquido', value: 'glifosato_480_sl_generico_liquido', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Glifosato Nortox 480 SL', value: 'glifosato_nortox_480_sl', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Roundup Original', value: 'roundup_original', composition: 'Glifosato 360 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Roundup Original Mais', value: 'roundup_original_mais', composition: 'Glifosato 480 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Roundup Transorb', value: 'roundup_transorb', composition: 'Glifosato 480 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Glifosato Genérico 500 Líquido', value: 'glifosato_generico_500_liquido', composition: 'Glifosato 500 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Zapp QI Líquido', value: 'zapp_qi_liquido', composition: 'Glifosato 500 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Crucial 698 Sumitomo', value: 'crucial_698_sumitomo', composition: 'Glifosato 540 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Glifosato Genérico WG 720', value: 'glifosato_generico_wg_720', composition: 'Glifosato 720 g/kg', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Roundup WG 720', value: 'roundup_wg_720', composition: 'Glifosato 720 g/kg', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Connor 200 SL', value: 'connor_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Finale 200 SL', value: 'finale_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Glufosinato Genérico 200 SL', value: 'glufosinato_generico_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Liberty 200 SL', value: 'liberty_200_sl', composition: 'Glufosinato 200 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Lifeline 280 SL', value: 'lifeline_280_sl', composition: 'Glufosinato 280 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Trunfo 280 SL', value: 'trunfo_280_sl', composition: 'Glufosinato 280 g/l', unit: 'l/ha' },
    { source: 'desiccation_pre_harvest', label: 'Outro', value: 'outro', composition: 'Outro', unit: 'l/ha' },

    { source: 'seed_variety', label: 'Variedade Semente', value: 'variedade_semente', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Mika', value: 'mika', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Oren', value: 'oren', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Ron', value: 'ron', composition: '', unit: '' },
    { source: 'seed_variety', label: 'K3', value: 'k3', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Victoria', value: 'victoria', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Jordan', value: 'jordan', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Anahy', value: 'anahy', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Seda', value: 'seda', composition: '', unit: '' },
    { source: 'seed_variety', label: 'Outro', value: 'outro', composition: 'Outro', unit: '' },
];


async function main() {
    try {
        // 1. Seed Database Options
        console.log('--- Seeding Database Options ---');
        await prisma.databaseOption.deleteMany();
        await prisma.databaseOption.createMany({ data: options });
        console.log(`Inserted ${options.length} options.`);


        // 2. Seed EME
        console.log('\n--- Seeding EME ---');
        await prisma.eME.deleteMany(); // Clear existing
        try {
            const emeWorkbook = XLSX.readFile(path.resolve(__dirname, '../EME.xlsx'));
            const emeSheet = emeWorkbook.Sheets[emeWorkbook.SheetNames[0]];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emeData: any[] = XLSX.utils.sheet_to_json(emeSheet);

            const emeRecords = emeData.map(row => ({
                uf: String(row['UF']).trim(),
                codigo: Number(row['Codigo']),
                eme: String(row['EME']).trim()
            }));

            if (emeRecords.length > 0) {
                await prisma.eME.createMany({ data: emeRecords });
                console.log(`Inserted ${emeRecords.length} EME records.`);
            } else {
                console.log('No EME records found in file.');
            }
        } catch (e) {
            console.error('Error reading EME.xlsx:', e);
        }


        // 3. Seed Rural Regions
        console.log('\n--- Seeding Rural Regions ---');
        await prisma.ruralRegion.deleteMany(); // Clear existing
        try {
            const rrWorkbook = XLSX.readFile(path.resolve(__dirname, '../Rural Regions.xlsx'));
            const rrSheet = rrWorkbook.Sheets[rrWorkbook.SheetNames[0]];
            // Explicitly map using header index because headers might be non-standard
            const rrData = XLSX.utils.sheet_to_json(rrSheet, { header: 1 }) as any[][];

            // Skip header row
            const rows = rrData.slice(1);

            const rrRecords = rows.map(row => {
                // Assuming order: munCode (0), municipality (1), stateCode (2), stateShort (3), rrCode (4)
                if (!row[0] || !row[4]) return null;

                return {
                    munCode: String(row[0]),
                    municipality: String(row[1]),
                    stateCode: String(row[2]),
                    stateShort: String(row[3]),
                    rrCode: Number(row[4])
                };
            }).filter(r => r !== null);

            if (rrRecords.length > 0) {
                // Batch insert to avoid "too many parameters" error if file is huge
                const BATCH_SIZE = 1000;
                for (let i = 0; i < rrRecords.length; i += BATCH_SIZE) {
                    const batch = rrRecords.slice(i, i + BATCH_SIZE);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await prisma.ruralRegion.createMany({ data: batch as any });
                }
                console.log(`Inserted ${rrRecords.length} Rural Region records.`);
            } else {
                console.log('No Rural Region records found.');
            }

        } catch (e) {
            console.error('Error reading Rural Regions.xlsx:', e);
        }


    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
