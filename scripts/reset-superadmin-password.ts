import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function resetPassword() {
    const newPassword = 'Merx2026!';
    const hash = await bcrypt.hash(newPassword, 12);
    
    const user = await db.user.update({
        where: { email: 'admin@merx.tech' },
        data: { 
            passwordHash: hash, 
            mustChangePassword: false // Don't require password change
        }
    });
    
    console.log('✅ Senha resetada com sucesso!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nova senha: ${newPassword}`);
    
    await db.$disconnect();
}

resetPassword().catch(console.error);
