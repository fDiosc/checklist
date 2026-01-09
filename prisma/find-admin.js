const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
    });
    console.log(admin ? admin.id : 'NOT_FOUND');
}

main().finally(() => prisma.$disconnect());
