import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Audiobook",
  description: "Convert PDFs to audio in any language.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}