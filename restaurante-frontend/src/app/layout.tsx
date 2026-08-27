import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Bar e Churrascaria Progresso",
  description: "Sistema profissional de gerenciamento de mesas e pedidos para restaurantes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-graphite text-slate-100 antialiased">
        <UserProvider>
          <Navbar />
          <div className="flex-1 flex flex-col">{children}</div>
          <footer className="border-t border-white/8 bg-graphite px-6 py-4 text-center text-xs text-slate-500">
            Marcos D&apos;França — Todos os direitos reservados
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
