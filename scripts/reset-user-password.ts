import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetUserPassword() {
    const email = process.argv[2] || 'admin@maxsum.com';
    const newPassword = process.argv[3] || 'Maxsum2026!';
    
    console.log(`🔍 Verificando usuário ${email}...\n`);
    
    const user = await prisma.user.findUnique({
        where: { email },
        include: { workspace: true }
    });
    
    if (!user) {
        console.log('❌ Usuário não encontrado!');
        console.log('\n📋 Usuários existentes:');
        const allUsers = await prisma.user.findMany({
            select: { email: true, name: true, role: true, workspace: { select: { name: true } } }
        });
        allUsers.forEach(u => {
            console.log(`   - ${u.email} (${u.role}) - Workspace: ${u.workspace?.name || 'Global'}`);
        });
        await prisma.$disconnect();
        return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Workspace: ${user.workspace?.name || 'Nenhum (Global)'}`);
    
    console.log(`\n📝 Resetando senha para: ${newPassword}`);
    const hash = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, mustChangePassword: false }
    });
    
    console.log('✅ Senha resetada com sucesso!');
    
    // Verify
    const isValid = await bcrypt.compare(newPassword, hash);
    console.log(`🔑 Verificação: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    await prisma.$disconnect();
}

resetUserPassword().catch(console.error);
