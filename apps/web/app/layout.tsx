import type { Metadata } from "next";
import { Space_Grotesk, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { IslandNav } from "@/components/IslandNav";
import { AuthProvider } from "@/lib/auth";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BOCC - Be Our Camera Crew",
  description:
    "Everyone's the camera crew. Scan a QR, drop your best shots, and the whole night pools into one gallery. AI finds every photo you're in from a single selfie.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${hankenGrotesk.variable}`}>
      <body className="text-white/90">
        <AuthProvider>
          <div className="mesh" aria-hidden />
          <div className="grain" aria-hidden />
          <IslandNav />
          <main className="relative z-10 mx-auto max-w-[1240px] px-6">{children}</main>
          <footer className="relative z-10 mt-10 border-t border-white/10">
            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-10 text-sm text-white/50">
              <span>BOCC - Be Our Camera Crew</span>
              <span className="font-mono">Immich engine · NestJS BFF · Next.js</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
