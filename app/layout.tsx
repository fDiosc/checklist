import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "MerX - Gestão de Contrapartes",
    description: "Sistema de gestão de compliance e auditoria digital para o agronegócio",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="pt-BR">
                <body className={inter.className}>
                    <QueryProvider>{children}</QueryProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
