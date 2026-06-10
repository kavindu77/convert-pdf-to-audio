"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Heading,
  Image,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Merge,
  MessageSquare,
  Mic,
  Palette,
  Paperclip,
  Plus,
  RotateCw,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  X,
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

            <header className="sticky top-0 relative border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-750 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={16} className="text-slate-900" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/tools/merge" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Compress PDF</Link>
            
            {/* Mega menu link dropdown style */}
            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                Convert PDF <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 flex flex-col gap-1 text-left">
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mb-1">Convert to PDF</div>
                <Link href="/tools/images-to-pdf" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileImage size={13} className="text-green-500 shrink-0" /> Images to PDF</Link>
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mt-2 mb-1">Convert from PDF</div>
                <Link href="/tools/pdf-to-images" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Image size={13} className="text-amber-500 shrink-0" /> PDF to Images</Link>
                <Link href="/tools/extract-text" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileText size={13} className="text-orange-500 shrink-0" /> Extract Text</Link>
                <Link href="/tools/pdf-to-audio" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Mic size={13} className="text-indigo-500 shrink-0" /> PDF to Audio</Link>
              </div>
            </div>

            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                All PDF Tools <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-[240px] mt-1 w-[720px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 grid grid-cols-4 gap-4 text-left">
                {/* Organize */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Organize PDF</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/merge" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Merge size={12} className="text-[#8b5cf6]" /> Merge PDF</Link>
                    <Link href="/tools/split" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Scissors size={12} className="text-[#ec4899]" /> Split PDF</Link>
                    <Link href="/tools/compress" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Archive size={12} className="text-[#06b6d4]" /> Compress PDF</Link>
                    <Link href="/tools/rotate" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><RotateCw size={12} className="text-[#a855f7]" /> Rotate PDF</Link>
                  </div>
                </div>
                {/* Security */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Security &amp; Privacy</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/privacy-report" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Eye size={12} className="text-[#14b8a6]" /> Privacy Report</Link>
                    <Link href="/tools/evidence-locker" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#3b82f6]" /> Evidence Locker</Link>
                    <Link href="/tools/fake-redaction" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><AlertOctagon size={12} className="text-[#ef4444]" /> Fake Redaction</Link>
                    <Link href="/tools/attachments" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Paperclip size={12} className="text-[#6366f1]" /> Attachments</Link>
                    <Link href="/tools/password-protect" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Lock size={12} className="text-[#ef4444]" /> Protect PDF</Link>
                  </div>
                </div>
                {/* Print */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Print &amp; Scan</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/color-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Palette size={12} className="text-[#10b981]" /> Color Detector</Link>
                    <Link href="/tools/ink-saver" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sun size={12} className="text-[#eab308]" /> Ink Saver</Link>
                    <Link href="/tools/bad-scan-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ScanLine size={12} className="text-[#ec4899]" /> Bad Scan</Link>
                    <Link href="/tools/watermark" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Droplets size={12} className="text-[#0ea5e9]" /> Watermark</Link>
                  </div>
                </div>
                {/* AI */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">AI &amp; Business</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/pdf-chat" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><MessageSquare size={12} className="text-[#818cf8]" /> PDF Q&amp;A Chat</Link>
                    <Link href="/tools/summarize" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sparkles size={12} className="text-[#d946ef]" /> Summarizer</Link>
                    <Link href="/tools/flashcards" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Layers size={12} className="text-[#10b981]" /> Flashcards</Link>
                    <Link href="/tools/pdf-to-audio" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Mic size={12} className="text-[#6366f1]" /> PDF to Audio</Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-slate-700 font-bold">{userName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Evidence Locker</h1>
          </div>
          <p className="text-slate-500">
            Create a tamper-proof record of any PDF (for contracts, invoices, or legal filings). Generates cryptographic verification reports and certificate PDFs.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-blue-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-slate-400 mb-4 animate-pulse" size={36} />
              <p className="text-sm text-slate-900 font-medium">Click or drag PDF here</p>
              <p className="text-xs text-slate-400 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setEvidence(null);
                  setCertificateUrl(null);
                  setManifestUrl(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !evidence && (
            <div className="flex justify-end">
              <button
                onClick={generateEvidenceRecord}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Generate Secure Record
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
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
            <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}

          {evidence && (
            <div className="p-5 bg-green-50 border border-green-200 text-green-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-700" />
                Evidence Locker Locked Successfully!
              </h3>
              
              <div className="p-3 bg-black/40 border border-slate-200 rounded-xl text-xs space-y-2.5 font-mono text-slate-600 break-all select-all">
                <p><span className="text-slate-400">SHA-256 HASH:</span> <span className="text-green-700 font-bold">{evidence.hash}</span></p>
                <p><span className="text-slate-400">TIMESTAMP:</span> {evidence.timestamp}</p>
                <p><span className="text-slate-400">PAGES:</span> {evidence.pagesCount} pages</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-3 justify-end">
                {manifestUrl && (
                  <a
                    href={manifestUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_manifest.json` : "manifest.json"}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Download size={14} /> Download Manifest
                  </a>
                )}
                {certificateUrl && (
                  <a
                    href={certificateUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_integrity_cert.pdf` : "integrity_cert.pdf"}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
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
