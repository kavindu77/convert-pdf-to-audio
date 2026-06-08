import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PDF to Audio — PDF Toolkit & Converter",
  description:
    "Convert PDFs to audiobooks, merge, split, compress, extract text, and more. Free online PDF tools — fast, private, no upload needed.",
  keywords: "pdf to audio, pdf tools, merge pdf, split pdf, compress pdf, extract text, pdf to images, images to pdf",
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}