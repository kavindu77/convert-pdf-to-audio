"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Merge,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldCheck,
  User,
  LogOut,
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
} from "lucide-react";

interface PDFFileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MergePDFPage() {
  const router = useRouter();
  const [files, setFiles] = useState<PDFFileEntry[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedSize, setMergedSize] = useState<number>(0);
  const [mergedPageCount, setMergedPageCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // App header states (synced with localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const loadPageCount = async (file: File): Promise<number | null> => {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return pdf.getPageCount();
    } catch {
      return null;
    }
  };

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      setError(null);
      setMergedBlob(null);

      const pdfFiles = newFiles.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        setError("Only PDF files are accepted.");
        return;
      }

      const entries: PDFFileEntry[] = await Promise.all(
        pdfFiles.map(async (file) => {
          const pageCount = await loadPageCount(file);
          return {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            pageCount,
          };
        })
      );

      setFiles((prev) => [...prev, ...entries]);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedBlob(null);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setMergedBlob(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsMerging(true);
    setError(null);
    setMergedBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const entry of files) {
        const buffer = await entry.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });

      setMergedBlob(blob);
      setMergedSize(blob.size);
      setMergedPageCount(mergedPdf.getPageCount());
    } catch (err: any) {
      console.error("Merge error:", err);
      setError(err?.message || "Failed to merge PDFs. Please check your files and try again.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFiles([]);
    setMergedBlob(null);
    setMergedSize(0);
    setMergedPageCount(0);
    setError(null);
  };

  const handleSignOut = () => {
    localStorage.setItem("user_logged_in", "false");
    setIsLoggedIn(false);
    router.push("/");
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Full-screen drag and drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-indigo-50/90 backdrop-blur-md border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-indigo-600 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-slate-900">Drop PDFs anywhere to upload</p>
          <p className="text-sm text-indigo-500/80 mt-1">Combine files locally in your browser</p>
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
            <Link href="/tools/merge" className="text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] border-b-2 border-indigo-500 pb-0.5">Merge PDF</Link>
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
                    <Link href="/tools/merge" className="text-[11px] text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Merge size={12} className="text-[#8b5cf6]" /> Merge PDF</Link>
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
        {files.length === 0 && (
          <div className="w-full max-w-3xl text-center space-y-6 animate-in">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mx-auto shadow-inner shadow-[#8b5cf6]/5">
                <Merge size={20} className="text-[#8b5cf6]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Merge PDF files</h1>
              <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                Combine multiple PDFs in the order you want with the simplest browser-based merger available.
              </p>
            </div>

            {/* Central massive Action button (iLovePDF Style) */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group relative px-9 py-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-extrabold text-base rounded-2xl transition-all duration-300 shadow-md shadow-[#8b5cf6]/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 shrink-0"
              >
                <Upload size={18} className="group-hover:scale-110 transition-transform duration-200" />
                Select PDF files
              </button>
              
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold pt-1">
                or drop PDFs here
              </p>
            </div>

            {/* Privacy notice badge */}
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto bg-white border border-slate-200/80 py-1.5 px-3 rounded-xl shadow-sm">
              🛡️ Processing runs 100% locally in your browser. Files never touch our servers.
            </p>
          </div>
        )}

        {/* State 2: Document Workspace (Active State) */}
        {files.length > 0 && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch animate-in">
            
            {/* Left: Document Grid */}
            <div className="flex-1 space-y-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Arrange Order</h2>
                  <p className="text-xs text-slate-400">Drag/drop or click buttons to rearrange the PDF merge sequence.</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-55 hover:bg-slate-100 rounded-xl text-[11px] font-extrabold text-indigo-600 transition-all border border-indigo-100 shadow-sm"
                >
                  <Plus size={12} /> Add More
                </button>
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {files.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 group hover:border-[#8b5cf6]/30 hover:bg-white transition-all shadow-sm"
                  >
                    {/* Position badge */}
                    <span className="w-6 h-6 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-[10.5px] flex items-center justify-center font-mono font-bold shrink-0">
                      {index + 1}
                    </span>

                    {/* PDF details */}
                    <FileText size={18} className="text-[#8b5cf6] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-bold text-slate-800 truncate">{entry.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(entry.size)}
                        {entry.pageCount !== null && ` · ${entry.pageCount} page${entry.pageCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Move operations */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveFile(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveFile(index, "down")}
                        disabled={index === files.length - 1}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all shrink-0 border border-transparent hover:border-red-100"
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs mt-3">
                  <X size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Summary and Actions Panel (iLovePDF Style Sidebar) */}
            <div className="w-full lg:w-76 bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-5 shadow-sm text-slate-700">
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Merge Summary</h3>
                </div>
                
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Total Files</span>
                    <span className="font-bold text-slate-800">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Pages</span>
                    <span className="font-bold text-slate-800">{totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Mode</span>
                    <span className="font-bold text-green-600">Local Browser</span>
                  </div>
                </div>
              </div>

              {/* Action trigger states */}
              <div className="space-y-2.5">
                {!mergedBlob ? (
                  <button
                    disabled={isMerging}
                    onClick={handleMerge}
                    className="w-full py-3 rounded-xl font-extrabold text-sm bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-all shadow-md shadow-[#8b5cf6]/10 flex items-center justify-center gap-2"
                  >
                    {isMerging ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Merging PDFs...
                      </>
                    ) : (
                      <>
                        <Merge size={15} />
                        Merge PDF files
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-slate-900">Merge successful!</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{mergedPageCount} pages · {formatFileSize(mergedSize)}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDownload}
                      className="w-full py-3.5 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={15} />
                      Download merged PDF
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2 rounded-xl border border-slate-200 text-xs text-slate-400 hover:text-slate-650 hover:bg-slate-50 font-bold transition-all"
                    >
                      Merge another set
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Minimal Footer (iLovePDF Style) */}
      <footer className="border-t border-slate-250/60 py-4 px-6 relative z-10 bg-slate-50 text-slate-500 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>

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
