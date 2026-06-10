"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
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
  FileWarning,
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

interface MissingPageReport {
  totalPages: number;
  detectedSequence: number[];
  missingPages: number[];
  duplicatePages: number[];
  wrongOrder: boolean;
  warnings: string[];
}

export default function MissingPagesDetector() {
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
  const [report, setReport] = useState<MissingPageReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractPageNumbersFromText = (text: string): number | null => {
    // Attempt to match patterns like "Page X of Y", "Page X", "X / Y", etc.
    const patterns = [
      /\b(?:page|pg\.?)\s*(\d+)\b/i,
      /\b(\d+)\s*\/\s*\d+\b/,
      /\b(\d+)\s*of\s*\d+\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) return num;
      }
    }

    // Fallback: look at the last few lines or first few lines for isolated numbers
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];
      
      const numFirst = parseInt(firstLine, 10);
      if (!isNaN(numFirst) && numFirst > 0 && numFirst < 10000 && /^\d+$/.test(firstLine)) return numFirst;

      const numLast = parseInt(lastLine, 10);
      if (!isNaN(numLast) && numLast > 0 && numLast < 10000 && /^\d+$/.test(lastLine)) return numLast;
    }

    return null;
  };

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setReport(null);
  }, []);

  const runAnalysis = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading PDF document...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const sequence: number[] = [];
      const warnings: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Scanning page ${i} text...`);
        setProgress(Math.round((i / numPages) * 90));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join("\n");
        
        const pageNum = extractPageNumbersFromText(pageText);
        sequence.push(pageNum !== null ? pageNum : -1); // -1 if not found
      }

      setProgressLabel("Analyzing page numbers...");
      setProgress(95);

      // Analyze page number sequence
      const validNumbers = sequence.filter(n => n !== -1);
      const uniqueNumbers = Array.from(new Set(validNumbers));
      
      let missing: number[] = [];
      let duplicates: number[] = [];
      let wrongOrder = false;

      if (validNumbers.length > 0) {
        const minNum = Math.min(...validNumbers);
        const maxNum = Math.max(...validNumbers);

        // Calculate missing
        for (let num = minNum; num <= maxNum; num++) {
          if (!uniqueNumbers.includes(num)) {
            missing.push(num);
          }
        }

        // Calculate duplicates
        const seen = new Set<number>();
        validNumbers.forEach(n => {
          if (seen.has(n)) duplicates.push(n);
          else seen.add(n);
        });
        duplicates = Array.from(new Set(duplicates));

        // Check order
        for (let idx = 1; idx < validNumbers.length; idx++) {
          if (validNumbers[idx] < validNumbers[idx - 1]) {
            wrongOrder = true;
            break;
          }
        }
      } else {
        warnings.push("No printed page numbers were detected in the text layer of this PDF.");
      }

      // Add descriptive warning notes
      if (sequence.includes(-1) && validNumbers.length > 0) {
        const missingTextCount = sequence.filter(n => n === -1).length;
        warnings.push(`${missingTextCount} pages did not have clear page number markers text found.`);
      }
      if (missing.length > 0) {
        warnings.push(`Detected gaps in numbering. Missing pages: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
      }
      if (duplicates.length > 0) {
        warnings.push(`Detected duplicate page numbers: ${duplicates.join(", ")}`);
      }
      if (wrongOrder) {
        warnings.push("Extracted page numbers are out of sequential order.");
      }

      setReport({
        totalPages: numPages,
        detectedSequence: sequence,
        missingPages: missing,
        duplicatePages: duplicates,
        wrongOrder,
        warnings,
      });
      setProgress(100);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || err}`);
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
            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center">
              <FileWarning size={20} className="text-pink-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Missing Page Detector</h1>
          </div>
          <p className="text-slate-500">
            Inspect the text of a scanned or compiled PDF to check if page sequences are missing, repeated, or out of order.
          </p>
        </div>

        {/* Upload Area */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-600 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) handleFile(dropped);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-pink-500/50 hover:bg-pink-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-slate-400 mb-4 animate-bounce" size={36} />
              <p className="text-sm text-slate-900 font-medium">Click or drag PDF here to scan</p>
              <p className="text-xs text-slate-400 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-200 text-pink-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setReport(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !report && (
            <div className="flex justify-end">
              <button
                onClick={runAnalysis}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Analyze Sequences
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-pink-600" />
                  {progressLabel}
                </span>
                <span className="text-pink-600 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {report && (
          <section className="space-y-6">
            <h2 className="font-semibold text-slate-900 text-lg">Sequence Report</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-400">Rendered Pages</p>
                <p className="text-2xl font-bold text-slate-900">{report.totalPages}</p>
              </div>
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-400">Missing Gaps</p>
                <p className={`text-2xl font-bold ${report.missingPages.length > 0 ? "text-red-800" : "text-green-700"}`}>
                  {report.missingPages.length}
                </p>
              </div>
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-400">Duplicate Numbers</p>
                <p className={`text-2xl font-bold ${report.duplicatePages.length > 0 ? "text-yellow-400" : "text-green-700"}`}>
                  {report.duplicatePages.length}
                </p>
              </div>
            </div>

            <div className="p-5 bg-white shadow-sm border border-slate-200/80 border border-slate-200 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className={report.warnings.length > 0 ? "text-yellow-400" : "text-green-700"} />
                Findings & Warnings
              </h3>

              {report.warnings.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-600 pl-4 list-disc">
                  {report.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3.5 rounded-xl">
                  <CheckCircle2 size={16} />
                  Sequence check passed! All detected page numbers are sequential with no missing pages.
                </div>
              )}
            </div>

            {/* Complete Sequence Log */}
            <div className="p-5 bg-white shadow-sm border border-slate-200/80 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Extracted Page Marking Map</h3>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {report.detectedSequence.map((num, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-center text-xs border ${
                      num === -1
                        ? "bg-slate-50 border border-slate-200 border-slate-200 text-slate-400"
                        : report.duplicatePages.includes(num)
                        ? "bg-yellow-50 border-yellow-250 text-yellow-800"
                        : report.missingPages.includes(num + 1)
                        ? "bg-red-50 border-red-200 text-red-300"
                        : "bg-green-50 border-green-200 text-green-800"
                    }`}
                  >
                    <div className="text-[10px] text-slate-400">Page {idx + 1}</div>
                    <div className="font-bold mt-0.5">{num === -1 ? "?" : num}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
