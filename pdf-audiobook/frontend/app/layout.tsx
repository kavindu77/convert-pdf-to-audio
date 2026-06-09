import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DocuSafe PDF — Private PDF Toolkit & Security Auditor",
  description:
    "Private PDF Toolkit. Audit security, reduce file sizes, detect signatures, inspect attachments, and execute multi-version timelines completely locally.",
  keywords: "pdf to audio, pdf tools, merge pdf, split pdf, compress pdf, extract text, pdf to images, images to pdf, docusafe, document safety, signature detection",
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}