import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELECTORAL DATA",
  description:
    "Sistema para encuestas de opinión ciudadana e intención de voto (modelo confidencial o seudonimizado).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}