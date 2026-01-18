export async function sendWhatsAppMessage(phone: string, text: string) {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!apiUrl || !apiKey || !instance) {
        throw new Error('Evolution API configuration missing (URL, Key, or Instance)');
    }

    // Normalização do telefone: apenas números
    let normalizedPhone = phone.replace(/\D/g, '');

    // Se tiver 10 ou 11 dígitos e não começar com 55, adicionamos o DDI Brasil
    if ((normalizedPhone.length === 10 || normalizedPhone.length === 11) && !normalizedPhone.startsWith('55')) {
        normalizedPhone = `55${normalizedPhone}`;
    }

    const endpoint = `${apiUrl}/message/sendText/${instance}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
        },
        body: JSON.stringify({
            number: normalizedPhone,
            options: {
                delay: 1200,
                presence: 'composing',
                linkPreview: true
            },
            textMessage: {
                text: text
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Evolution API Error:', errorData);
        throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
    }

    return await response.json();
}
