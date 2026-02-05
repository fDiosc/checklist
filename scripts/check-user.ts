import { db } from '../lib/db';

async function checkUser() {
    const user = await db.user.findUnique({
        where: { email: 'admin@merx.tech' },
        include: { workspace: true }
    });
    
    if (!user) {
        console.log('❌ Usuário não encontrado');
        return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   WorkspaceId: ${user.workspaceId}`);
    console.log(`   Workspace: ${user.workspace?.name || 'N/A'}`);
    console.log(`   MustChangePassword: ${user.mustChangePassword}`);
    console.log(`   PasswordHash exists: ${!!user.passwordHash}`);
    console.log(`   PasswordHash length: ${user.passwordHash?.length}`);
    
    await db.$disconnect();
}

checkUser().catch(console.error);
