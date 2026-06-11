"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UsageGateModal from "../../components/UsageGateModal";
import { verifyUsageAndGetToken, recordUsageSuccess } from "../../utils/usageClient";
import {
  Scissors,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  FileImage,
  Image,
  Mic,
  Palette,
  Sun,
  ScanLine,
  Droplets,
  Activity,
  MessageSquare,
  Sparkles,
  Layers,
  Heading,
  AlertOctagon,
  Lock,
  Paperclip,
  Merge,
  Archive,
  RotateCw,
  Eye,
  EyeOff,
} from "lucide-react";

type SplitMode = "every-page" | "custom-ranges";

interface SplitResult {
  fileName: string;
  pageLabel: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseRanges(input: string, totalPages: number): number[][] {
  const groups: number[][] = [];
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < 1 || end < start || end > totalPages) {
        throw new Error(`Invalid range "${part}". Pages must be between 1 and ${totalPages}.`);
      }
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i);
      groups.push(pages);
    } else if (/^\d+$/.test(part)) {
      const page = parseInt(part, 10);
      if (page < 1 || page > totalPages) {
        throw new Error(`Page ${page} is out of range. PDF has ${totalPages} pages.`);
      }
      groups.push([page]);
    } else {
      throw new Error(`Cannot parse "${part}". Use formats like "1-3, 5, 7-10".`);
    }
  }

  if (groups.length === 0) {
    throw new Error("Please enter at least one page or range.");
  }

  return groups;
}

export default function SplitPdfPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const [splitMode, setSplitMode] = useState<SplitMode>("every-page");
  const [rangeInput, setRangeInput] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // App header states (synced with localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100 MB.");
      return;
    }

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();

      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(count);
    } catch {
      setError("Failed to read PDF. The file may be corrupted or password-protected.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) loadFile(droppedFile);
    },
    [loadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) loadFile(selected);
    },
    [loadFile]
  );

  const handleSplit = async () => {
    if (!file || !pdfBytes || totalPages === 0) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    try {
      // Perform server-side access check & token creation
      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "split",
        toolName: "Split PDF",
        fileSizeMb: file.size / (1024 * 1024),
        pageCount: totalPages,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsProcessing(false);
        return;
      }

      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;

      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      let pageGroups: number[][];
      if (splitMode === "every-page") {
        pageGroups = Array.from({ length: totalPages }, (_, i) => [i + 1]);
      } else {
        pageGroups = parseRanges(rangeInput, totalPages);
      }

      const zip = new JSZip();
      const splitResults: SplitResult[] = [];
      let totalBytes = 0;

      for (let i = 0; i < pageGroups.length; i++) {
        const group = pageGroups[i];
        const newPdf = await PDFDocument.create();
        const indices = group.map((p) => p - 1); // 0-indexed
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const pdfData = await newPdf.save();
        const pageLabel =
          group.length === 1
            ? `page-${group[0]}`
            : `pages-${group[0]}-${group[group.length - 1]}`;
        const fileName = `${(file?.name || "document").replace(/\.pdf$/i, "")}_${pageLabel}.pdf`;

        zip.file(fileName, pdfData);
        splitResults.push({
          fileName,
          pageLabel: group.length === 1 ? `Page ${group[0]}` : `Pages ${group[0]}–${group[group.length - 1]}`,
          size: pdfData.length,
        });
        totalBytes += pdfData.length;

        setProgress(Math.round(((i + 1) / pageGroups.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });

      // Record successful execution
      const recordSuccess = await recordUsageSuccess({
        jobToken: checkResult.jobToken!,
        jobId: checkResult.jobId!,
        toolSlug: "split",
        fileSizeMb: file.size / (1024 * 1024),
        pageCount: totalPages,
        fileCount: 1,
      });

      if (!recordSuccess) {
        throw new Error("Failed to record usage event. Please try again.");
      }

      setZipBlob(blob);
      setResults(splitResults);
      setTotalSize(totalBytes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred while splitting the PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(file?.name || "document").replace(/\.pdf$/i, "")}_split.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setTotalPages(0);
    setSplitMode("every-page");
    setRangeInput("");
    setResults(null);
    setZipBlob(null);
    setProgress(0);
    setError(null);
    setTotalSize(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-pink-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-pink-50/90 backdrop-blur-md border-4 border-dashed border-pink-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-pink-600 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-slate-900">Drop PDF anywhere to upload</p>
          <p className="text-sm text-pink-500/80 mt-1">Split locally in your browser</p>
        </div>
      )}

      {/* Header (Same as Homepage dropdown mega menu style - Light Mode) */}
      <header className="sticky top-0 relative border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-750">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/tools/merge" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Merge PDF</Link>
            <Link href="/tools/split" className="text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] border-b-2 border-pink-500 pb-0.5">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Compress PDF</Link>
            
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

      {/* Main Workspace */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-7xl mx-auto w-full">
        
        {/* State 1: Upload (Empty State matching iLovePDF) */}
        {file === null && (
          <div className="w-full max-w-3xl text-center space-y-6 animate-in">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-pink-500/10 border border-pink-400/20 flex items-center justify-center mx-auto shadow-inner shadow-pink-500/5">
                <Scissors size={20} className="text-pink-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Split PDF file</h1>
              <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                Split a PDF into individual pages or custom ranges.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="group relative px-9 py-4 bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold text-base rounded-2xl transition-all duration-300 shadow-md shadow-pink-500/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 shrink-0"
              >
                <Upload size={18} className="group-hover:scale-110 transition-transform duration-200" />
                Select PDF file
              </button>
              
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold pt-1">
                or drop PDF here
              </p>
            </div>

            <p className="text-[10px] text-slate-400 max-w-sm mx-auto bg-white border border-slate-200/80 py-1.5 px-3 rounded-xl shadow-sm">
              🛡️ Processing runs 100% locally in your browser. Files never touch our servers.
            </p>
          </div>
        )}

        {/* State 2: Document Workspace (Active State) */}
        {file !== null && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch animate-in">
            
            {/* Left: Document View */}
            <div className="flex-1 space-y-5 bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-center shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Selected PDF File</h2>
                  <p className="text-xs text-slate-400">Ready to split pages and extract sections.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-55 hover:bg-red-50 hover:text-red-650 rounded-lg text-xs font-bold text-slate-450 transition-all border border-slate-200/50"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              {/* Selected File Card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 relative overflow-hidden max-w-xl mx-auto w-full mb-3">
                <FileText size={32} className="text-pink-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-850 text-xs truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(file.size)} · {totalPages} page{totalPages !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {splitMode === "custom-ranges" && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 max-w-xl mx-auto w-full text-xs text-slate-500 shadow-inner">
                  <AlertTriangle size={15} className="text-pink-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Custom Range Syntax:</span> Enter page numbers separated by commas (e.g. <span className="text-slate-700">1, 3, 5</span>) or ranges (e.g. <span className="text-slate-700">2-4, 6-9</span>). Each entry splits into a separate document.
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs mt-2 max-w-xl mx-auto w-full animate-in">
                  <X size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Actions / Results Panel (Sidebar style) */}
            <div className="w-full lg:w-76 bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-5 shadow-sm text-slate-700">
              
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Split Settings</h3>
                </div>

                {!results && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Split Mode</label>
                      <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 border border-slate-200/50 rounded-xl text-[9.5px]">
                        <button
                          onClick={() => setSplitMode("every-page")}
                          className={`py-1.5 rounded-lg font-bold transition-all ${splitMode === "every-page" ? "bg-white text-slate-850 shadow-sm" : "text-slate-400"}`}
                        >
                          Split Every Page
                        </button>
                        <button
                          onClick={() => setSplitMode("custom-ranges")}
                          className={`py-1.5 rounded-lg font-bold transition-all ${splitMode === "custom-ranges" ? "bg-white text-slate-850 shadow-sm" : "text-slate-400"}`}
                        >
                          Custom Ranges
                        </button>
                      </div>
                    </div>

                    {splitMode === "custom-ranges" && (
                      <div className="space-y-1 animate-in">
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Enter Ranges</label>
                        <input
                          type="text"
                          value={rangeInput}
                          onChange={(e) => setRangeInput(e.target.value)}
                          placeholder="e.g. 1-3, 5, 7-10"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-slate-850"
                        />
                      </div>
                    )}
                  </div>
                )}

                {results && (
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Total Output Files</span>
                      <span className="font-bold text-slate-800">{results.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ZIP File Size</span>
                      <span className="font-bold text-slate-800">{zipBlob ? formatFileSize(zipBlob.size) : ""}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {!results ? (
                  <div className="space-y-4">
                    {isProcessing ? (
                      <div className="space-y-2.5 animate-in">
                        <div className="flex items-center justify-between text-xs text-slate-505">
                          <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-pink-500" /> Processing pages...</span>
                          <span className="font-mono font-bold">{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: "#ec4899",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleSplit}
                        disabled={splitMode === "custom-ranges" && rangeInput.trim() === ""}
                        className="w-full py-3 rounded-xl font-extrabold text-sm bg-pink-500 hover:bg-[#db2777] text-white transition-all shadow-md shadow-pink-500/10 flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        <Scissors size={15} />
                        Split PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-slate-900">Split Complete!</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Extracted {results.length} documents.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3.5 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={15} />
                      Download ZIP Archive
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2 rounded-xl border border-slate-200 text-xs text-slate-400 hover:text-slate-655 hover:bg-slate-50 font-bold transition-all"
                    >
                      Split another PDF
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-250/60 py-4 px-6 relative z-10 bg-slate-50 text-slate-500 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact Us</Link>
          </div>
        </div>
      </footer>

      {/* Usage Gate Modal */}
      <UsageGateModal />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
