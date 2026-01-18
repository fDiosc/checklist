import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Mapeamento de nome completo do estado para UF
const stateNameToUF: Record<string, string> = {
    "acre": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM", "bahia": "BA",
    "ceará": "CE", "distrito federal": "DF", "espírito santo": "ES", "goiás": "GO",
    "maranhão": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
    "pará": "PA", "paraíba": "PB", "paraná": "PR", "pernambuco": "PE", "piauí": "PI",
    "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
    "rondônia": "RO", "roraima": "RR", "santa catarina": "SC", "são paulo": "SP",
    "sergipe": "SE", "tocantins": "TO"
};

function normalizeUF(input: string): string {
    // Se já é uma sigla de 2 letras, usa diretamente
    if (input.length === 2) {
        return input.toUpperCase();
    }
    // Tenta converter nome completo para UF
    const normalized = input.toLowerCase().trim();
    return stateNameToUF[normalized] || input.toUpperCase();
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ufParam = searchParams.get("uf");
        const city = searchParams.get("city");

        if (!ufParam) {
            return NextResponse.json({ error: "UF is required" }, { status: 400 });
        }

        const uf = normalizeUF(ufParam);

        // Buscar EME pelo UF
        const eme = await db.eME.findUnique({
            where: { uf: uf },
        });

        // Buscar Rural Region por UF + município (case-insensitive)
        let ruralRegion = null;
        if (city) {
            ruralRegion = await db.ruralRegion.findFirst({
                where: {
                    stateShort: uf,
                    municipality: {
                        equals: city,
                        mode: "insensitive",
                    },
                },
            });
        }

        return NextResponse.json({
            eme: eme?.eme || null,
            emeCodigo: eme?.codigo || null,
            ruralRegionCode: ruralRegion?.rrCode || null,
            municipality: ruralRegion?.municipality || city,
        });
    } catch (error) {
        console.error("Lookup EME/RR Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
