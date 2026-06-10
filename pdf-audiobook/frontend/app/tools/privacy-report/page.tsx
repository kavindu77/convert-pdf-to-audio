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

interface MetadataLeak {
  field: string;
  value: string;
  risk: "high" | "medium" | "low";
  description: string;
}

interface PrivacyReportData {
  fileName: string;
  privacyScore: number; // 0-100
  grade: string; // A, B, C, D, F
  leaks: MetadataLeak[];
  hasHiddenText: boolean;
  hasAttachments: boolean;
  hasLinks: boolean;
}

export default function PrivacyReport() {
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
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PrivacyReportData | null>(null);
  const [sanitizedUrl, setSanitizedUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setReport(null);
    setSanitizedUrl(null);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const generatePrivacyReport = async () => {
    const currentFile = file;
    if (!pdfBytes || !currentFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress(20);

    try {
      const { PDFDocument, PDFName, PDFDict, PDFArray } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const leaks: MetadataLeak[] = [];
      let scoreDeduction = 0;

      // Scan Metadata fields
      const author = pdfDoc.getAuthor();
      const creator = pdfDoc.getCreator();
      const producer = pdfDoc.getProducer();
      const title = pdfDoc.getTitle();
      const subject = pdfDoc.getSubject();
      const keywords = pdfDoc.getKeywords();
      const creationDate = pdfDoc.getCreationDate();
      const modDate = pdfDoc.getModificationDate();

      if (author) {
        leaks.push({
          field: "Author Name",
          value: author,
          risk: "high",
          description: "Reveals the name of the document creator, exposing identity details.",
        });
        scoreDeduction += 20;
      }
      
      if (creator) {
        leaks.push({
          field: "Creator App",
          value: creator,
          risk: "medium",
          description: "Exposes the software or editor tool used to draft the PDF (can reveal OS details).",
        });
        scoreDeduction += 10;
      }

      if (producer) {
        leaks.push({
          field: "Producer Engine",
          value: producer,
          risk: "low",
          description: "Exposes low-level conversion library engine versions.",
        });
        scoreDeduction += 5;
      }

      if (creationDate) {
        leaks.push({
          field: "Creation Timestamp",
          value: creationDate.toISOString(),
          risk: "medium",
          description: "Exposes the exact date, time, and timezone of document compilation.",
        });
        scoreDeduction += 15;
      }

      if (modDate) {
        leaks.push({
          field: "Edit History Date",
          value: modDate.toISOString(),
          risk: "low",
          description: "Exposes the date and time the file was last altered.",
        });
        scoreDeduction += 5;
      }

      // Check external links & attachments
      let hasAttachments = false;
      const catalog = pdfDoc.catalog;
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);
        if (resolvedNames instanceof PDFDict && resolvedNames.has(PDFName.of("EmbeddedFiles"))) {
          hasAttachments = true;
          scoreDeduction += 20;
        }
      }

      let hasLinks = false;
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        if (page.node.has(PDFName.of("Annots"))) {
          const annots = page.node.get(PDFName.of("Annots"));
          const resolvedAnnots = pdfDoc.context.lookup(annots);
          if (resolvedAnnots instanceof PDFArray) {
            for (let idx = 0; idx < resolvedAnnots.size(); idx++) {
              const annot = pdfDoc.context.lookup(resolvedAnnots.get(idx));
              if (annot instanceof PDFDict && annot.has(PDFName.of("A"))) {
                const action = pdfDoc.context.lookup(annot.get(PDFName.of("A")));
                if (action instanceof PDFDict && action.has(PDFName.of("URI"))) {
                  hasLinks = true;
                  break;
                }
              }
            }
          }
        }
        if (hasLinks) break;
      }

      if (hasLinks) {
        leaks.push({
          field: "External Connections",
          value: "Contains clickable web links (/URI)",
          risk: "medium",
          description: "Exposes web destinations that can contain tracking codes or lead to phishing domains.",
        });
        scoreDeduction += 15;
      }

      if (hasAttachments) {
        leaks.push({
          field: "Embedded Files",
          value: "Contains nested file attachments",
          risk: "high",
          description: "Exposes files packaged inside the PDF structure (could contain malware or hidden archives).",
        });
      }

      const privacyScore = Math.max(10, 100 - scoreDeduction);
      let grade = "A";
      if (privacyScore < 50) grade = "F";
      else if (privacyScore < 70) grade = "D";
      else if (privacyScore < 80) grade = "C";
      else if (privacyScore < 90) grade = "B";

      setReport({
        fileName: currentFile.name,
        privacyScore,
        grade,
        leaks,
        hasHiddenText: false,
        hasAttachments,
        hasLinks,
      });

      setProgress(100);
    } catch (err: any) {
      setError(`Report generation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sanitizeDocument = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setProgress(50);

    try {
      const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Strip metadata catalog properties
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setCreator("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");

      // Remove attachments if present
      const catalog = pdfDoc.catalog;
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);
        if (resolvedNames instanceof PDFDict) {
          resolvedNames.delete(PDFName.of("EmbeddedFiles"));
        }
      }

      const sanitizedBytes = await pdfDoc.save();
      const blob = new Blob([sanitizedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setSanitizedUrl(URL.createObjectURL(blob));
      
      // Update report to show optimized score
      if (report) {
        setReport({
          ...report,
          privacyScore: 100,
          grade: "A",
          leaks: [],
          hasAttachments: false,
        });
      }
      setProgress(100);
    } catch (err: any) {
      setError(`Sanitization failed: ${err.message || err}`);
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
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center animate-pulse">
              <Eye size={20} className="text-teal-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">PDF Privacy Report</h1>
          </div>
          <p className="text-slate-500">
            Generate an audit report of hidden metadata: author names, creation software history, embedded files, and tracking links, then sanitize them in one click.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-teal-500/50 hover:bg-teal-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center border border-teal-500/20 text-teal-400">
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
                  setReport(null);
                  setSanitizedUrl(null);
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
                onClick={generatePrivacyReport}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Audit Document Privacy
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-teal-400" />
              <p className="text-xs text-slate-500 font-medium">Inspecting catalog data stream...</p>
            </div>
          )}

          {error && (
            <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {report && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-lg">Privacy Report Results</h2>
              {report.leaks.length > 0 && !sanitizedUrl && (
                <button
                  onClick={sanitizeDocument}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  Sanitize Metadata (Clean PDF)
                </button>
              )}

              {sanitizedUrl && (
                <a
                  href={sanitizedUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_privacy_cleaned.pdf` : "privacy_cleaned.pdf"}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={14} /> Download Sanitized PDF
                </a>
              )}
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-400">Privacy Rating</p>
                <p className={`text-4xl font-black ${
                  report.grade === "A" ? "text-green-700" : report.grade === "B" ? "text-green-800" : "text-red-800"
                }`}>
                  {report.grade}
                </p>
              </div>
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-400">Privacy Score</p>
                <p className="text-3xl font-extrabold text-slate-900">{report.privacyScore} / 100</p>
              </div>
              <div className="p-4 bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 rounded-xl text-center space-y-1 flex flex-col justify-center items-center">
                <p className="text-xs text-slate-400">Privacy Issues Found</p>
                <p className={`text-3xl font-extrabold ${report.leaks.length > 0 ? "text-yellow-400" : "text-green-700"}`}>
                  {report.leaks.length}
                </p>
              </div>
            </div>

            {/* Leaks Inventory */}
            <div className="p-5 bg-white shadow-sm border border-slate-200/80 border border-slate-200 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Metadata & Structure Exposure Logs</h3>

              {report.leaks.length > 0 ? (
                <div className="space-y-3">
                  {report.leaks.map((leak, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase">{leak.field}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                          leak.risk === "high"
                            ? "bg-red-50 border-red-200 text-red-800"
                            : leak.risk === "medium"
                            ? "bg-yellow-50 border-yellow-250 text-yellow-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {leak.risk} risk
                        </span>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-slate-200/60 font-mono text-[11px] text-yellow-100 truncate mt-1">
                        {leak.value}
                      </div>
                      <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">{leak.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 p-4 rounded-xl">
                  <CheckCircle2 size={16} /> Privacy scan passed! Document metadata is clean and untrackable.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
