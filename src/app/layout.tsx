import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { resolveLogoSrc } from "@/components/brand/BrandLogo";
import { SiteBootLoader } from "@/components/brand/SiteBootLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BOOM Cleaning Services | Professional Cleaning in Abuja",
  description: "Book trained, professional home and office cleaners in Abuja. Choose your service, see your price and request an available time online.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <SiteBootLoader logoSrc={resolveLogoSrc("onLight")} />
        {children}
      </body>
    </html>
  );
}
