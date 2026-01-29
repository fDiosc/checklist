// Parse the user's list and count items
const userList = `Fertilizante Solo	Boro Ulexita	B2O3 43%
Fertilizante Solo	Algen Lithothamnium	Ca 34% Ma3% a.a.5%
Fertilizante Solo	KCl	K2O 60%
Fertilizante Solo	Aspire	N 00% - P 00% - K 58% - B 0,5
Fertilizante Solo	NPK 00-20-20	N 00% - P 20% - K 20%
Fertilizante Solo	MAP	N 11%-P 52%-K 00%
Fertilizante Solo	NPK 18-00-18	N 18%-P 00%-K 18%
Fertilizante Solo	Sulfato de Amônio	N 20%-P 00%-K 00% - S 22%
Fertilizante Solo	NPK 20-00-20	N 20%-P 00%-K 20%
Fertilizante Solo	Novatec Solub 45	N 45%
Fertilizante Solo	Uréia	N 45%
Fertilizante Solo	Athos Mosaic	NPK 03 32 08 + 0,2 Zn + 0,1 B
Fertilizante Solo	Outro	Outro
Fertilizante Solo	Superfosfato Simples	P2O5 20%-S 10%
Fertilizante Solo	Superfosfato Triplo	P2O5 45%-Ca 10%
Fertilizante Solo	Enxofre	
Fertilizante Solo	Manganês	
Fertilizante Solo	Níquel	
Fertilizante Solo	Zinco	
Tratamento Sementes	Promov NiCoMo (TS)	aa 6% - B 0,5% - Co 1% - K2O 1% - Mn 0,5% - Mg 1% - Mo 4,6% - Ni 0,4% - P2O5 2% - Zn 2%
Tratamento Sementes	Fipronil Genérico 250 FS	Fipronil 250 g/l
Tratamento Sementes	Shelter	Fipronil 250 g/l
Tratamento Sementes	Standak	Fipronil 250 g/l
Tratamento Sementes	Standak Top	Fipronil 250 g/l + Tiofanato Metílico 225 g/l + Piraclostrobina 25 g/l
Tratamento Sementes	Gaucho FS 600	Imidacloprid 600 g/l
Tratamento Sementes	Imidacloprid FS 600 Genérico	Imidacloprid 600 g/l
Tratamento Sementes	Up Seeds	Mo 9% - Ni 0,9% - Co 0,45% - K2O 2,3% - polimero
Tratamento Sementes	Outro	Outro
Tratamento Sementes	Simplex	Simplex
Tratamento Sementes	Stimulate	Stimulate
Tratamento Sementes	Aprove	Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l
Tratamento Sementes	Certeza N	Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l
Tratamento Sementes	Firmeza N	Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l
Tratamento Sementes	Plust	Tiofanato Metílico 350 g/l + Fluazinam 52,5 g/l
Dessecação Pré Plantio	Glifosato 480 SL Genérico Líquido	Glifosato 360 g/l
Dessecação Pré Plantio	Glifosato Nortox 480 SL	Glifosato 360 g/l
Dessecação Pré Plantio	Roundup Original	Glifosato 360 g/l
Dessecação Pré Plantio	Roundup Original Mais	Glifosato 480 g/l
Dessecação Pré Plantio	Roundup Transorb	Glifosato 480 g/l
Dessecação Pré Plantio	Glifosato Genérico 500 Líquido	Glifosato 500 g/l
Dessecação Pré Plantio	Zapp QI Líquido	Glifosato 500 g/l
Dessecação Pré Plantio	Crucial 698 Sumitomo	Glifosato 540 g/l
Dessecação Pré Plantio	Glifosato Genérico WG 720	Glifosato 720 g/kg
Dessecação Pré Plantio	Roundup WG 720	Glifosato 720 g/kg
Dessecação Pré Plantio	Connor 200 SL	Glufosinato 200 g/l
Dessecação Pré Plantio	Finale 200 SL	Glufosinato 200 g/l
Dessecação Pré Plantio	Glufosinato Genérico 200 SL	Glufosinato 200 g/l
Dessecação Pré Plantio	Liberty 200 SL	Glufosinato 200 g/l
Dessecação Pré Plantio	Lifeline 280 SL	Glufosinato 280 g/l
Dessecação Pré Plantio	Trunfo 280 SL	Glufosinato 280 g/l
Dessecação Pré Plantio	Outro	Outro
Dessecação Pré Plantio	Dual Gold 960 EC	S Metolachlor 960 g/l
Dessecação Pré Plantio	S Metolachlor Genérico	S Metolachlor 960 g/l
Pré Emergente Plante Aplique	Plateau	Imazapic 700 g/kg
Pré Emergente Plante Aplique	Outro	Outro
Pré Emergente Plante Aplique	Dual Gold 960 EC	S Metolachlor 960 g/l
Pré Emergente Plante Aplique	S Metolachlor Genérico	S Metolachlor 960 g/l
Pós Emergente Folhas Estreitas	Cletodim Genérico	Cletodim 240 g/l
Pós Emergente Folhas Estreitas	Poquer 	Cletodim 240 g/l
Pós Emergente Folhas Estreitas	Select	Cletodim 240 g/l
Pós Emergente Folhas Estreitas	Verdict R	Haloxifope 124,7 g/l
Pós Emergente Folhas Estreitas	Verdict Max	Haloxifope 540 g/l
Pós Emergente Folhas Largas	Vezir	Imazetapir 106 g/l
Pós Emergente Folhas Largas	Zephir	Imazetapir 106 g/l
Pós Emergente Folhas Largas	Imazetapir Nortox	Imazetapir 212 g/l
Pós Emergente Folhas Largas	Outro	Outro
Controle de Insetos	Acefato CCAB 750 SP	Acefato 750 g/kg
Controle de Insetos	Acefato Nortox	Acefato 750 g/kg
Controle de Insetos	Feroce	Acefato 850 g/kg + Bifentrina 30 g/kg
Controle de Insetos	Magnum 	Acefato 970 g/kg
Controle de Insetos	Perito 970 SG	Acefato 970 g/kg
Controle de Insetos	Bifentrina 100 EC Nortox	Bifentrina 100 g/l
Controle de Insetos	Bifentrina CCAB 100 EC	Bifentrina 100 g/l
Controle de Insetos	Talstar 400 EC	Bifentrina 400 g/l
Controle de Insetos	Valente	Extrato de Neem
Controle de Insetos	Galil SC	Imidacloprid 250 g/l + Bifentrina 50 g/l
Controle de Insetos	Karate Zeon 250 CS	Lambda-cialotrina 250 g/l
Controle de Insetos	Lambda-cialotrina Genérica	Lambda-cialotrina 250 g/l
Controle de Insetos	Lufenuron Genérico	Lufenuron 50 g/l
Controle de Insetos	Match EC	Lufenuron 50 g/l
Controle de Insetos	Lannate BR	Metomil 250 g/l
Controle de Insetos	Methomex 215 SL	Metomil 250 g/l
Controle de Insetos	Metomil 215 SL Nortox	Metomil 250 g/l
Controle de Insetos	Metomil Genérico 215 SL	Metomil 250 g/l
Controle de Insetos	Metomy	Metomil 250 g/l
Controle de Insetos	Outro	Outro
Controle de Insetos	Engeo Pleno S	Tiametoxam 141 g/l + Lambad-cialotrina 106 g/l
Manejo de Doenças	Avanço	 (Beauveria bassiana cepa66; Metarhizium anisopliae. cepa425). 1x10^7 + micotoxinas 
Manejo de Doenças	Orbital 	(Mix de 5 Bacillus spp. 1x10^10)
Manejo de Doenças	Sfinge 	(Trichoderma harz. 1x10^7 + enzimas)
Manejo de Doenças	Defender	Bacillus subtilis, Bacillus pumilus e Bacillus velezensis;(1x10^10+Pool enzimatico)
Manejo de Doenças	Bravonil 500 SC	Clorotalonil 500 g/l
Manejo de Doenças	Clorotalonil Genérico 500 SC	Clorotalonil 500 g/l
Manejo de Doenças	Bravonil Top	Clorotalonil 500 g/l + Difenoconazol 50 g/l
Manejo de Doenças	Miravis Duo	Difenoconazol 125 g/l + Pidiflumetofem 75 g/l
Manejo de Doenças	Difenoconazol Genérico	Difenoconazol 250 g/l
Manejo de Doenças	Score	Difenoconazol 250 g/l
Manejo de Doenças	Score Flexi	Difenoconazol 250 g/l + Propiconazol 250 g/l
Manejo de Doenças	Orkestra	Fluxapiroxade 133 g/l + Piraclostrobina 333 g/l
Manejo de Doenças	Outro	Outro
Manejo de Doenças	Mob Reforce 	Peróxidos orgânicos IP6%
Nutrição Foliar	Esplendido	B 0,2% - Co 0,3% - Mn 2% - Mg 4% - Mo 3% - N 5%
Nutrição Foliar	Detox Bor	B 10%
Nutrição Foliar	Dominio	Bioestimulante
Nutrição Foliar	Borum	Boro 100 g/l
Nutrição Foliar	Co-Mo	Co-Mo
Nutrição Foliar	Manganês	Manganês
Nutrição Foliar	Nitro Mag	Mg 6% - N 6%
Nutrição Foliar	Níquel	Níquel
Nutrição Foliar	BoroTop	Octaborato Sódio 20,5%B
Nutrição Foliar	Outro	Outro
Nutrição Foliar	aa 6% - K2O 12% - Mn 0,5% - P2O5 2%- Zn 2,1%	
Nutrição Foliar	Hormonal Grão Forte	
Dessecação Pré Colheita	Diquat CCAB 200 SL	Diquat 200 g/l
Dessecação Pré Colheita	Diquat Genérico 200 SL	Diquat 200 g/l
Dessecação Pré Colheita	Diquat Nortox	Diquat 200 g/l
Dessecação Pré Colheita	Reglone	Diquat 200 g/l
Dessecação Pré Colheita	Glifosato 480 SL Genérico Líquido	Glifosato 360 g/l
Dessecação Pré Colheita	Glifosato Nortox 480 SL	Glifosato 360 g/l
Dessecação Pré Colheita	Roundup Original	Glifosato 360 g/l
Dessecação Pré Colheita	Roundup Original Mais	Glifosato 480 g/l
Dessecação Pré Colheita	Roundup Transorb	Glifosato 480 g/l
Dessecação Pré Colheita	Glifosato Genérico 500 Líquido	Glifosato 500 g/l
Dessecação Pré Colheita	Zapp QI Líquido	Glifosato 500 g/l
Dessecação Pré Colheita	Crucial 698 Sumitomo	Glifosato 540 g/l
Dessecação Pré Colheita	Glifosato Genérico WG 720	Glifosato 720 g/kg
Dessecação Pré Colheita	Roundup WG 720	Glifosato 720 g/kg
Dessecação Pré Colheita	Connor 200 SL	Glufosinato 200 g/l
Dessecação Pré Colheita	Finale 200 SL	Glufosinato 200 g/l
Dessecação Pré Colheita	Glufosinato Genérico 200 SL	Glufosinato 200 g/l
Dessecação Pré Colheita	Liberty 200 SL	Glufosinato 200 g/l
Dessecação Pré Colheita	Lifeline 280 SL	Glufosinato 280 g/l
Dessecação Pré Colheita	Trunfo 280 SL	Glufosinato 280 g/l
Nutrição Foliar	Sublime	K2O 25% - S 17%
Dessecação Pré Colheita	Outro	Outro
Nutrição Foliar	Exnitro	N 30%
Nutrição Foliar	Starter Mn Platinium	5% N; 4% S; 0,3% B; 0,3% Cu; 5% Mn; 0,05% Mo; 3% Zn
Nutrição Foliar	ProfolExclusive	N 10% -K2O 3% -  S  9,4% - Mg 1,0% - B 2% - Cu 0,1%  - Mn 6,5%-  Zn 9%
Nutrição Foliar	Profol Produtividade	K2O 10% - S 12,3% - Mg 1,5% - B 1,5% - Cu 0,5% - Mn 14% - Zn 4,5%
Nutrição Foliar	Speed	K2O 10% - S 12,4% - Mg 1,8% - B 1,5% - Cu 0,25% - Mn 14%- Zn 5%
Nutrição Foliar	Borotop	B 20%`;

const lines = userList.split('\n').filter(line => line.trim());
console.log(`Total de linhas na lista: ${lines.length}`);

// Parse each line
const items = lines.map((line, index) => {
    const parts = line.split('\t');
    return {
        num: index + 1,
        uso: parts[0]?.trim() || '',
        produto: parts[1]?.trim() || '',
        composicao: parts[2]?.trim() || ''
    };
});

// Count by category
const byCategory = {};
items.forEach(item => {
    byCategory[item.uso] = (byCategory[item.uso] || 0) + 1;
});

console.log('\nContagem por categoria:');
let total = 0;
Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
    total += count;
});
console.log(`\nTotal: ${total}`);

// Check for potential issues
console.log('\n=== ITENS POTENCIALMENTE PROBLEMÁTICOS ===\n');
items.forEach(item => {
    if (!item.produto || item.produto === '') {
        console.log(`Linha ${item.num}: Produto vazio - Uso: "${item.uso}"`);
    }
    if (item.produto && item.composicao === '' && !['Enxofre', 'Manganês', 'Níquel', 'Zinco', 'Hormonal Grão Forte'].includes(item.produto)) {
        // Check if produto looks like composição (has %)
        if (item.produto.includes('%')) {
            console.log(`Linha ${item.num}: SUSPEITO - Produto parece ser composição: "${item.produto}"`);
        }
    }
});

// Find the item "aa 6% - K2O 12%..." which seems out of place
const suspectItems = items.filter(i => i.produto.includes('%') && i.produto.includes('-'));
console.log('\n=== ITENS COM PRODUTO PARECENDO COMPOSIÇÃO ===');
suspectItems.forEach(i => {
    console.log(`Linha ${i.num}: "${i.produto}" (${i.uso})`);
});
