/**
 * Seed Script: Cadastros Maxsum BR
 * 
 * Registers:
 * 1. Team members (supervisors + admins) - 8 users
 * 2. Producers - 19 unique producers from CSVs
 * 3. Supervisor-Producer links
 * 
 * Idempotent: checks if records exist before creating.
 * 
 * Usage: npx tsx scripts/seed-cadastros.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Maxsum2026!';
const WORKSPACE_SEARCH = 'Maxsum';

// ============================================
// HELPERS
// ============================================

function cleanCpf(raw: string): string {
    return raw.replace(/[.\-\/\s]/g, '').trim();
}

function cleanPhone(raw: string): string {
    // Keep + for international, strip everything else except digits
    return raw.replace(/[^\d+]/g, '').trim();
}

// ============================================
// DATA: Team Members
// ============================================

interface TeamMember {
    name: string;
    email: string;
    cpf: string | null;
    phone: string | null;
    role: 'ADMIN' | 'SUPERVISOR';
    cargo: string;
}

const teamMembers: TeamMember[] = [
    {
        name: 'Erico Gasparini Cardoso',
        email: 'erico.cardoso@maxsumseeds.com',
        cpf: '00990387739',
        phone: '11961454085',
        role: 'ADMIN',
        cargo: 'Diretor Geral Brasil',
    },
    {
        name: 'Arlan Alves Lourenço',
        email: 'arlan@maxsumseeds.com',
        cpf: '01607244144',
        phone: '66984282343',
        role: 'SUPERVISOR',
        cargo: 'Agrônomo de Desenvolvimento de Mercado',
    },
    {
        name: 'João Manuel Barreto da Costa',
        email: 'joao.costa@maxsumseeds.com',
        cpf: '09206187406',
        phone: '84994610250',
        role: 'SUPERVISOR',
        cargo: 'Agrônomo de Desenvolvimento de Mercado',
    },
    {
        name: 'Toniel da Costa Rezende',
        email: 'toniel.rezende@maxsumseeds.com',
        cpf: '88762530178',
        phone: '64999160514',
        role: 'SUPERVISOR',
        cargo: 'Agrônomo de Desenvolvimento de Mercado',
    },
    {
        name: 'Luis Cláudio Prado',
        email: 'luis.prado@maxsumseeds.com',
        cpf: '75378639620',
        phone: '6281386416',
        role: 'SUPERVISOR',
        cargo: 'Agrônomo de Desenvolvimento de Mercado',
    },
    {
        name: 'Marcelo Marelli',
        email: 'marcelo.marelli@maxsumseeds.com',
        cpf: null,
        phone: '+5491159955622',
        role: 'ADMIN',
        cargo: 'Diretor Operações Grãos',
    },
    {
        name: 'Mauro Gonzales',
        email: 'mg.1973@hotmail.com',
        cpf: null,
        phone: null,
        role: 'ADMIN',
        cargo: 'Líder Sustentabilidade e Rastreabilidade',
    },
    {
        name: 'Rodrigo Gutierrez',
        email: 'rodrigo.gutierrez@maxsumseeds.com',
        cpf: '11486016863',
        phone: '11970930885',
        role: 'ADMIN',
        cargo: 'Conselheiro',
    },
];

// ============================================
// DATA: Producers
// ============================================

interface ProducerData {
    name: string;
    cpf: string;
    phone: string | null;
    city: string;
    state: string;
    subjectType: 'person' | 'org';
    supervisorEmail: string | null; // email of the supervisor to link
}

const producers: ProducerData[] = [
    // === Ferrari (TO) - 10 producers ===
    {
        name: 'ADEMAR VANZELA',
        cpf: '43991785900',
        phone: '44991528350',
        city: 'VILA RICA',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
    {
        name: 'ELOI ZOTTI',
        cpf: '59567686068',
        phone: '63991486860',
        city: 'MIRACEMA',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'JULIANA PIRES MARTINS',
        cpf: '70186673132',
        phone: '64998111250',
        city: 'PARAUNA',
        state: 'GO',
        subjectType: 'person',
        supervisorEmail: null,
    },
    {
        name: 'ELLYANE DOS SANTOS',
        cpf: '70291667104',
        phone: '63845104200',
        city: 'MONTE DO CARMO',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'MOISES LANGNI',
        cpf: '41418948004',
        phone: '63998426560',
        city: 'FIGUEIROPOLIS',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'RODRIGO EGIDIO MIGUEL',
        cpf: '08347842620',
        phone: '34966906960',
        city: 'ITUITABA',
        state: 'MG',
        subjectType: 'person',
        supervisorEmail: null,
    },
    {
        name: 'RONALDO MARANHÃO',
        cpf: '11750340100',
        phone: '63997894920',
        city: 'PEDRO AFONSO',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'ADRIANO FERNANDES',
        cpf: '03863503961',
        phone: '63994970200',
        city: 'MIRANORTE',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'MARCUS DALOSSE',
        cpf: '02300898950',
        phone: '63921046550',
        city: 'CHAPADA DA NATIVIDADE',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'LUIZA POSI',
        cpf: '04265859925',
        phone: '63922175570',
        city: 'SANTA ROSA',
        state: 'TO',
        subjectType: 'person',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },

    // === Santa Colomba (SC) - 2 producers ===
    {
        name: 'Santa Colomba Agropecuária S.A.',
        cpf: '03785640000142',
        phone: '18997322900',
        city: 'Cocos',
        state: 'BA',
        subjectType: 'org',
        supervisorEmail: 'toniel.rezende@maxsumseeds.com',
    },
    {
        name: 'Oscar Stroschon',
        cpf: '30925649015',
        phone: '61996787574',
        city: 'Flores de Goiás',
        state: 'GO',
        subjectType: 'person',
        supervisorEmail: 'toniel.rezende@maxsumseeds.com',
    },

    // === Sebra - 7 unique producers ===
    {
        name: 'Rafael Schenkel',
        cpf: '83709088100',
        phone: '66999810334',
        city: 'Paranatinga',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
    {
        name: 'Rodrigo Martins',
        cpf: '17517971001692',
        phone: '18996337488',
        city: 'Candido Mota',
        state: 'SP',
        subjectType: 'org',
        supervisorEmail: null,
    },
    {
        name: 'Guilherme Medeiros',
        cpf: '02409292178',
        phone: '64996076600',
        city: 'Santa Cruz Xingu',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
    {
        name: 'Rafael Telles',
        cpf: '34436881873',
        phone: '18996681967',
        city: 'Canarana',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
    {
        name: 'Jerri Guizzo',
        cpf: '93077262991',
        phone: '65999661822',
        city: 'Paratininga',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
    {
        name: 'Cataratas',
        cpf: '18200245000209',
        phone: '94992301060',
        city: 'Redenção',
        state: 'PA',
        subjectType: 'org',
        supervisorEmail: 'joao.costa@maxsumseeds.com',
    },
    {
        name: 'Marcus Vinicius Botelho',
        cpf: '26950491883',
        phone: '65984617414',
        city: 'Rosario Oeste',
        state: 'MT',
        subjectType: 'person',
        supervisorEmail: 'arlan@maxsumseeds.com',
    },
];

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function findWorkspace(): Promise<string> {
    const workspaces = await prisma.workspace.findMany({
        where: { name: { contains: WORKSPACE_SEARCH, mode: 'insensitive' } }
    });

    console.log('Workspaces found:');
    workspaces.forEach(w => console.log(`  - "${w.name}" (id: ${w.id}, parent: ${w.parentWorkspaceId || 'none'})`));

    // Prefer "Maxsum BR" specifically
    const ws = workspaces.find(w => w.name.toLowerCase().includes('maxsum br')) || workspaces[0];

    if (!ws) {
        throw new Error('No workspace matching "Maxsum" found. Please create it first.');
    }

    console.log(`\nUsing workspace: "${ws.name}" (${ws.id})\n`);
    return ws.id;
}

async function seedTeamMembers(workspaceId: string): Promise<Map<string, string>> {
    console.log('\n========================================');
    console.log('PHASE 1: Registering Team Members');
    console.log('========================================\n');

    const passwordHash = await hash(DEFAULT_PASSWORD, 10);
    const emailToIdMap = new Map<string, string>();

    for (const member of teamMembers) {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: member.email }
        });

        if (existing) {
            console.log(`[SKIP] ${member.name} (${member.email}) - already exists (id: ${existing.id})`);
            emailToIdMap.set(member.email, existing.id);
            continue;
        }

        const user = await prisma.user.create({
            data: {
                email: member.email,
                name: member.name,
                passwordHash,
                mustChangePassword: true,
                cpf: member.cpf,
                role: member.role,
                workspaceId,
            }
        });

        console.log(`[CREATED] ${member.name} (${member.email}) - role: ${member.role}, id: ${user.id}`);
        emailToIdMap.set(member.email, user.id);
    }

    console.log(`\nTeam members processed: ${teamMembers.length}`);
    console.log(`Default password: ${DEFAULT_PASSWORD} (users must change on first login)\n`);

    return emailToIdMap;
}

async function seedProducers(workspaceId: string, supervisorMap: Map<string, string>) {
    console.log('\n========================================');
    console.log('PHASE 2: Registering Producers');
    console.log('========================================\n');

    let created = 0;
    let skipped = 0;
    let linked = 0;

    for (const prod of producers) {
        // Check if producer already exists (by cpf + workspace)
        const existing = await prisma.producer.findFirst({
            where: {
                cpf: prod.cpf,
                workspaceId,
            }
        });

        if (existing) {
            console.log(`[SKIP] ${prod.name} (cpf: ${prod.cpf}) - already exists (id: ${existing.id})`);
            skipped++;

            // Still ensure supervisor link exists
            if (prod.supervisorEmail) {
                const supervisorId = supervisorMap.get(prod.supervisorEmail);
                if (supervisorId) {
                    await prisma.producer.update({
                        where: { id: existing.id },
                        data: {
                            assignedSupervisors: {
                                connect: { id: supervisorId }
                            }
                        }
                    });
                    console.log(`  -> Linked to supervisor: ${prod.supervisorEmail}`);
                    linked++;
                }
            }
            continue;
        }

        // Build create data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createData: any = {
            workspaceId,
            name: prod.name,
            cpf: prod.cpf,
            phone: prod.phone,
            city: prod.city,
            state: prod.state,
            countryCode: 'BR',
            subjectType: prod.subjectType,
        };

        // Add supervisor link if available
        if (prod.supervisorEmail) {
            const supervisorId = supervisorMap.get(prod.supervisorEmail);
            if (supervisorId) {
                createData.assignedSupervisors = {
                    connect: { id: supervisorId }
                };
                linked++;
            } else {
                console.warn(`  WARNING: Supervisor ${prod.supervisorEmail} not found in map.`);
            }
        }

        const producer = await prisma.producer.create({ data: createData });
        console.log(`[CREATED] ${prod.name} (cpf: ${prod.cpf}) - id: ${producer.id}${prod.supervisorEmail ? ` -> ${prod.supervisorEmail}` : ''}`);
        created++;
    }

    console.log(`\n--- Producers Summary ---`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Supervisor links: ${linked}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('=== SEED CADASTROS: Maxsum BR ===\n');

    try {
        // 1. Find workspace
        const workspaceId = await findWorkspace();

        // 2. Register team members (supervisors + admins)
        const emailToIdMap = await seedTeamMembers(workspaceId);

        // 3. Register producers and link to supervisors
        await seedProducers(workspaceId, emailToIdMap);

        console.log('\n=== SEED CADASTROS COMPLETED SUCCESSFULLY ===\n');
    } catch (error) {
        console.error('\n=== SEED CADASTROS FAILED ===\n', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
