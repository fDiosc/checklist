import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/evolution';

// WhatsApp message templates per locale
const WHATSAPP_TEMPLATES: Record<string, (name: string, templateName: string, link: string) => string> = {
    'pt-BR': (name, templateName, link) => 
        `Olá ${name}! 👋\n\nSiga o link abaixo para preencher o checklist *${templateName}*:\n\n${link}\n\nObrigado!`,
    'en': (name, templateName, link) => 
        `Hello ${name}! 👋\n\nFollow the link below to fill out the checklist *${templateName}*:\n\n${link}\n\nThank you!`,
    'es': (name, templateName, link) => 
        `Hola ${name}! 👋\n\nSigue el enlace a continuación para completar el checklist *${templateName}*:\n\n${link}\n\n¡Gracias!`
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: checklistId } = await params;
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Parse optional locale from request body
        let locale = 'pt-BR';
        try {
            const body = await req.json().catch(() => ({}));
            if (body.locale && WHATSAPP_TEMPLATES[body.locale]) {
                locale = body.locale;
            }
        } catch {
            // No body, use default locale
        }

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
        const messageTemplate = WHATSAPP_TEMPLATES[locale] || WHATSAPP_TEMPLATES['pt-BR'];
        const message = messageTemplate(
            checklist.producer?.name || 'Produtor',
            checklist.template.name,
            publicLink
        );

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
    } catch (error: unknown) {
        console.error('[WHATSAPP_SEND_ERROR]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro ao enviar WhatsApp' },
            { status: 500 }
        );
    }
}
