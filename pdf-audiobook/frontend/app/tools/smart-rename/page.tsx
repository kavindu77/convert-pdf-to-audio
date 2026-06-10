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
  RefreshCw,
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

interface NamingMetadata {
  invoiceNumber: string;
  date: string;
  companyName: string;
  title: string;
}

export default function SmartRename() {
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
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<NamingMetadata | null>(null);
  const [customName, setCustomName] = useState<string>("");
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setMetadata(null);
    setCustomName("");
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const scanForNamingMetadata = async () => {
    if (!file || !pdfBytes) return;

    setIsProcessing(true);
    setError(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      
      // We read the first page text which contains invoice header info
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");

      // Regex scans
      // 1. Date finder
      const dateRegex = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i;
      const dateMatch = text.match(dateRegex);
      const foundDate = dateMatch ? dateMatch[0].replace(/[/.]/g, "-") : "";

      // 2. Invoice number finder
      const invRegex = /\b(?:invoice|inv|bill|receipt|receipt#|inv#|invoice#)\b[:#\s]*([a-z0-9-]+)/i;
      const invMatch = text.match(invRegex);
      const foundInv = invMatch && invMatch[1] && invMatch[1].length > 2 ? invMatch[1] : "";

      // 3. Company indicator finder
      const compRegex = /\b([a-z0-9\s,&]+(?:\bInc\b|\bLLC\b|\bCorp\b|\bLtd\b|\bCo\b|\bGroup\b|\bGmbH\b))/i;
      const compMatch = text.match(compRegex);
      const foundComp = compMatch ? compMatch[1].trim() : "";

      // 4. Title / Header estimation
      // We look at the first few lines of text
      const lines = textContent.items
        .map((item: any) => item.str.trim())
        .filter((l: string) => l.length > 3 && l.length < 50);
      const foundTitle = lines.length > 0 ? lines[0] : "Document";

      const meta: NamingMetadata = {
        invoiceNumber: foundInv,
        date: foundDate,
        companyName: foundComp,
        title: foundTitle,
      };

      setMetadata(meta);

      // Construct standard format template name
      // e.g. 2026-06-09_AcmeCorp_Invoice_INV-1029.pdf
      const parts: string[] = [];
      if (foundDate) parts.push(foundDate);
      if (foundComp) parts.push(foundComp.replace(/[\s,]+/g, ""));
      if (foundInv) parts.push(`Inv-${foundInv}`);
      else parts.push(foundTitle.replace(/[\s,]+/g, ""));

      setCustomName(parts.filter(Boolean).join("_") + ".pdf");

    } catch (err: any) {
      setError(`Smart scan failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyNamingTemplate = (type: "invoice" | "date-title" | "simple") => {
    if (!metadata) return;
    const parts: string[] = [];

    if (type === "invoice") {
      if (metadata.date) parts.push(metadata.date);
      if (metadata.companyName) parts.push(metadata.companyName.replace(/[\s,]+/g, ""));
      if (metadata.invoiceNumber) parts.push(`Inv-${metadata.invoiceNumber}`);
    } else if (type === "date-title") {
      if (metadata.date) parts.push(metadata.date);
      if (metadata.title) parts.push(metadata.title.replace(/[\s,]+/g, ""));
    } else {
      if (metadata.title) parts.push(metadata.title.replace(/[\s,]+/g, ""));
    }

    setCustomName(parts.filter(Boolean).join("_") + ".pdf");
  };

  const downloadRenamedPdf = () => {
    if (!pdfBytes || !customName) return;

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = customName.endsWith(".pdf") ? customName : `${customName}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <Heading size={20} className="text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Smart Rename</h1>
          </div>
          <p className="text-slate-500">
            Automatically rename your PDFs based on extracted invoice numbers, dates, customer names, or title headers on the first page.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 text-cyan-400">
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
                  setMetadata(null);
                  setCustomName("");
                }}
                className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !metadata && (
            <div className="flex justify-end">
              <button
                onClick={scanForNamingMetadata}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Scan & Rename
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <p className="text-xs text-slate-500 font-medium">Scanning text coordinates...</p>
            </div>
          )}

          {error && (
            <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Templates Selector */}
        {metadata && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
              Naming Options
            </h2>

            {/* Scanned stats details */}
            <div className="p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl text-xs space-y-2.5">
              <p className="font-bold text-slate-600">Scanned Document Indicators:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p><span className="text-slate-400">Invoice ID:</span> <span className="text-yellow-100 font-medium">{metadata.invoiceNumber || "Not found"}</span></p>
                <p><span className="text-slate-400">Company Name:</span> <span className="text-yellow-100 font-medium">{metadata.companyName || "Not found"}</span></p>
                <p><span className="text-slate-400">Date Marker:</span> <span className="text-yellow-100 font-medium">{metadata.date || "Not found"}</span></p>
                <p><span className="text-slate-400">Header Title:</span> <span className="text-yellow-100 font-medium">{metadata.title || "Not found"}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs text-slate-500 font-semibold">Pre-defined Renaming Presets</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => applyNamingTemplate("invoice")}
                  className="p-3 bg-slate-50 border border-slate-200 border border-slate-200 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-900">Invoice Format</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date_Company_InvID.pdf</p>
                </button>
                <button
                  onClick={() => applyNamingTemplate("date-title")}
                  className="p-3 bg-slate-50 border border-slate-200 border border-slate-200 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-900">General Report</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date_Title.pdf</p>
                </button>
                <button
                  onClick={() => applyNamingTemplate("simple")}
                  className="p-3 bg-slate-50 border border-slate-200 border border-slate-200 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-slate-900">Simple Title</p>
                  <p className="text-[10px] text-slate-400 mt-1">Title.pdf</p>
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-semibold">Proposed File Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-3 bg-gray-900 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 text-slate-900 font-mono"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200/60">
              <button
                onClick={downloadRenamedPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                <Download size={16} /> Save & Download
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
