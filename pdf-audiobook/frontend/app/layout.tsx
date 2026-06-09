import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const geist = GeistSans;

export const metadata: Metadata = {
  title: "DocuSafe PDF — Private PDF Toolkit & Security Auditor",
  description:
    "Private PDF Toolkit. Audit security, reduce file sizes, detect signatures, inspect attachments, and execute multi-version timelines completely locally.",
  keywords: "pdf to audio, pdf tools, merge pdf, split pdf, compress pdf, extract text, pdf to images, images to pdf, docusafe, document safety, signature detection",
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={`${geist.className} font-sans`}>{children}</body>
    </html>
  );
}