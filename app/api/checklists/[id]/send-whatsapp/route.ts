import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const checklistId = params.id;

        // Buscar checklist com produtor
        const checklist = await db.checklist.findUnique({
            where: { id: checklistId },
            include: {
                producer: true,
                template: true,
            },
        });

        if (!checklist) {
            return new NextResponse('Checklist not found', { status: 404 });
        }

        const phone = checklist.producer?.phone;
        if (!phone) {
            return NextResponse.json(
                { error: 'Produtor não possui telefone cadastrado.' },
                { status: 400 }
            );
        }

        const publicLink = `${process.env.NEXT_PUBLIC_APP_URL}/c/${checklist.publicToken}`;
        const message = `Olá ${checklist.producer?.name}! 👋\n\nSiga o link abaixo para preencher o checklist *${checklist.template.name}*:\n\n${publicLink}\n\nObrigado!`;

        // Enviar mensagem via Evolution API
        await sendWhatsAppMessage(phone, message);

        // Atualizar logs de envio no checklist
        await db.checklist.update({
            where: { id: checklistId },
            data: {
                sentAt: new Date(),
                sentVia: 'WHATSAPP',
                sentTo: phone,
                status: checklist.status === 'DRAFT' ? 'SENT' : checklist.status
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[WHATSAPP_SEND_ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao enviar WhatsApp' },
            { status: 500 }
        );
    }
}
