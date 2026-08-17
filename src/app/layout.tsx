import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import LicenseGate from "@/components/LicenseGate";
import UpdateGate from "@/components/UpdateGate";
import SafeModeGate from "@/components/SafeModeGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GlobalErrorListeners from "@/components/GlobalErrorListeners";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AyrisLegal",
  description: "Yapay zeka destekli hukuki çalışma alanı",
};

const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('ayrislegal-theme');
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <ErrorBoundary>
          <GlobalErrorListeners />
          <SafeModeGate>
            <LicenseGate>
              <UpdateGate>{children}</UpdateGate>
            </LicenseGate>
          </SafeModeGate>
        </ErrorBoundary>
      </body>
    </html>
  );
}
