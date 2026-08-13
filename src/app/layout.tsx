import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmotionAI - Detección de Emociones en Tiempo Real",
  description:
    "Sistema de detección facial de emociones en tiempo real con dashboard analítico. Detecta emociones, cuenta personas y genera mensajes contextuales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
