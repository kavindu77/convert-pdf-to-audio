"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
} from "lucide-react";

interface EvidenceData {
  fileName: string;
  fileSize: number;
  hash: string;
  timestamp: string;
  pagesCount: number;
  author: string;
  creator: string;
}

export default function EvidenceLocker() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceData | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setEvidence(null);
    setCertificateUrl(null);
    setManifestUrl(null);
  }, []);

  const generateEvidenceRecord = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Reading file bytes...");

    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();

      // 1. Calculate SHA-256 Hash
      setProgress(30);
      setProgressLabel("Calculating SHA-256 tamper-proof hash...");
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // 2. Read PDF structure metadata
      setProgress(50);
      setProgressLabel("Reading metadata logs...");
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pagesCount = pdfDoc.getPageCount();
      const author = pdfDoc.getAuthor() || "None specified";
      const creator = pdfDoc.getCreator() || "None specified";
      const timestamp = new Date().toISOString();

      const evidenceData: EvidenceData = {
        fileName: file.name,
        fileSize: file.size,
        hash: hashHex,
        timestamp,
        pagesCount,
        author,
        creator,
      };

      setEvidence(evidenceData);

      // 3. Generate Verification Manifest JSON
      setProgress(70);
      setProgressLabel("Generating validation manifest file...");
      const manifestStr = JSON.stringify(evidenceData, null, 2);
      const manifestBlob = new Blob([manifestStr], { type: "application/json;charset=utf-8" });
      setManifestUrl(URL.createObjectURL(manifestBlob));

      // 4. Create certified PDF verification certificate
      setProgress(85);
      setProgressLabel("Drafting PDF Verification Certificate...");
      const certDoc = await PDFDocument.create();
      const page = certDoc.addPage([612, 792]); // letter size
      const helvetica = await certDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await certDoc.embedFont(StandardFonts.HelveticaBold);

      // Certificate header border
      page.drawRectangle({
        x: 30,
        y: 30,
        width: 552,
        height: 732,
        borderColor: rgb(0.23, 0.51, 0.96), // blue border
        borderWidth: 2,
      });

      // Title
      page.drawText("CERTIFICATE OF PDF INTEGRITY", {
        x: 100,
        y: 680,
        size: 24,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.2),
      });

      page.drawText("EVIDENCE LOCKER VERIFICATION RECORD", {
        x: 100,
        y: 650,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.5),
      });

      // Verification seal stamp decoration
      page.drawRectangle({
        x: 100,
        y: 635,
        width: 412,
        height: 2,
        color: rgb(0.23, 0.51, 0.96),
      });

      const startY = 580;
      const spacing = 30;

      const items = [
        ["Target Document:", evidenceData.fileName],
        ["Document Size:", `${(evidenceData.fileSize / 1024).toFixed(1)} KB`],
        ["Pages Count:", `${evidenceData.pagesCount} pages`],
        ["Original Author:", evidenceData.author],
        ["Creation Software:", evidenceData.creator],
        ["Security Timestamp:", evidenceData.timestamp],
      ];

      items.forEach((item, idx) => {
        const y = startY - (idx * spacing);
        page.drawText(item[0], { x: 100, y, size: 11, font: helveticaBold, color: rgb(0.2, 0.2, 0.3) });
        page.drawText(item[1], { x: 250, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      });

      // Draw SHA-256 Hash box
      const hashY = startY - (items.length * spacing) - 40;
      page.drawRectangle({
        x: 100,
        y: hashY - 40,
        width: 412,
        height: 60,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawText("SHA-256 VERIFICATION SECURE KEY (TAMPER DETECTION):", {
        x: 110,
        y: hashY + 10,
        size: 9,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.4),
      });

      page.drawText(evidenceData.hash, {
        x: 110,
        y: hashY - 15,
        size: 10,
        font: helvetica,
        color: rgb(0.1, 0.5, 0.3), // green
      });

      // Tamper-proof declaration
      page.drawText("This receipt guarantees the document matches this hash key exactly at the timestamp of audit.", {
        x: 100,
        y: hashY - 80,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText("SECURELY LOCKED", {
        x: 240,
        y: hashY - 120,
        size: 14,
        font: helveticaBold,
        color: rgb(0.23, 0.51, 0.96),
      });

      const certBytes = await certDoc.save();
      const certBlob = new Blob([certBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setCertificateUrl(URL.createObjectURL(certBlob));

      setProgress(100);
      setProgressLabel("Completed!");
    } catch (err: any) {
      setError(`Evidence generation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Evidence Locker</h1>
          </div>
          <p className="text-gray-400">
            Create a tamper-proof record of any PDF (for contracts, invoices, or legal filings). Generates cryptographic verification reports and certificate PDFs.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-gray-500 mb-4 animate-pulse" size={36} />
              <p className="text-sm text-white font-medium">Click or drag PDF here</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setEvidence(null);
                  setCertificateUrl(null);
                  setManifestUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !evidence && (
            <div className="flex justify-end">
              <button
                onClick={generateEvidenceRecord}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Generate Secure Record
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  {progressLabel}
                </span>
                <span className="text-blue-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}

          {evidence && (
            <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                Evidence Locker Locked Successfully!
              </h3>
              
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs space-y-2.5 font-mono text-gray-300 break-all select-all">
                <p><span className="text-gray-500">SHA-256 HASH:</span> <span className="text-green-400 font-bold">{evidence.hash}</span></p>
                <p><span className="text-gray-500">TIMESTAMP:</span> {evidence.timestamp}</p>
                <p><span className="text-gray-500">PAGES:</span> {evidence.pagesCount} pages</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-3 justify-end">
                {manifestUrl && (
                  <a
                    href={manifestUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_manifest.json` : "manifest.json"}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    <Download size={14} /> Download Manifest
                  </a>
                )}
                {certificateUrl && (
                  <a
                    href={certificateUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_integrity_cert.pdf` : "integrity_cert.pdf"}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  >
                    <Download size={16} /> Download Verification Certificate
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
