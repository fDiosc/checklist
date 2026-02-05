import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkSuperAdmin() {
    console.log('🔍 Verificando usuário admin@merx.tech...\n');
    
    const user = await prisma.user.findUnique({
        where: { email: 'admin@merx.tech' },
        include: { workspace: true }
    });
    
    if (!user) {
        console.log('❌ Usuário não encontrado!');
        console.log('\n📝 Criando novo SuperAdmin...');
        
        const hash = await bcrypt.hash('Merx2026!', 12);
        const newUser = await prisma.user.create({
            data: {
                email: 'admin@merx.tech',
                name: 'Super Admin',
                passwordHash: hash,
                role: 'SUPERADMIN',
                mustChangePassword: false,
            }
        });
        
        console.log('✅ SuperAdmin criado com sucesso!');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Senha: Merx2026!`);
    } else {
        console.log('✅ Usuário encontrado:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Workspace: ${user.workspace?.name || 'Nenhum (Global)'}`);
        console.log(`   Must Change Password: ${user.mustChangePassword}`);
        console.log(`   Password Hash (primeiros 20 chars): ${user.passwordHash.substring(0, 20)}...`);
        
        // Test password
        const testPassword = 'Merx2026!';
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);
        console.log(`\n🔑 Testando senha "${testPassword}": ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        
        if (!isValid) {
            console.log('\n📝 Resetando senha...');
            const hash = await bcrypt.hash(testPassword, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hash, mustChangePassword: false }
            });
            console.log('✅ Senha resetada para: Merx2026!');
        }
    }
    
    await prisma.$disconnect();
}

checkSuperAdmin().catch(console.error);
