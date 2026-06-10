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

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);

  return (
    <div 
      className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[130px] top-[-20%] left-[-10%] mix-blend-screen" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px] bottom-[-20%] right-[-10%] mix-blend-screen" />
      </div>

      {/* Full-screen drag and drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-md border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-indigo-400 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-white">Drop PDFs anywhere to upload</p>
          <p className="text-sm text-indigo-300/80 mt-1">Combine files locally in your browser</p>
        </div>
      )}

      {/* Header (Same as Homepage) */}
      <header className="sticky top-0 relative border-b border-white/5 px-6 py-3.5 flex items-center justify-between z-40 backdrop-blur-md bg-gray-950/80">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              DocuSafe<span className="text-indigo-400 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-[13px] font-bold text-gray-400/90">
            <Link href="/tools/merge" className="text-white transition-colors uppercase tracking-wider text-[11px] border-b-2 border-indigo-500 pb-0.5">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-white transition-colors uppercase tracking-wider text-[11px]">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-white transition-colors uppercase tracking-wider text-[11px]">Compress PDF</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-gray-300 font-medium">{userName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-7xl mx-auto w-full">
        
        {/* State 1: Upload (Empty State matching iLovePDF) */}
        {files.length === 0 && (
          <div className="w-full max-w-3xl text-center space-y-8 animate-in">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mx-auto shadow-inner shadow-[#8b5cf6]/5">
                <Merge size={22} className="text-[#8b5cf6]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Merge PDF files</h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
                Combine multiple PDFs in the order you want with the simplest browser-based merger available.
              </p>
            </div>

            {/* Central massive Action button (iLovePDF Style) */}
            <div className="flex flex-col items-center justify-center space-y-4">
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
                className="group relative px-10 py-5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-[#8b5cf6]/25 hover:shadow-[#8b5cf6]/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 shrink-0"
              >
                <Upload size={22} className="group-hover:scale-110 transition-transform duration-200" />
                Select PDF files
              </button>
              
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold pt-1">
                or drop PDFs here
              </p>
            </div>

            {/* Privacy notice badge */}
            <p className="text-[11px] text-gray-600 max-w-sm mx-auto bg-white/[0.01] border border-white/5 py-1.5 px-3 rounded-xl">
              🛡️ Processing runs 100% locally in your browser. Files never touch our servers.
            </p>
          </div>
        )}

        {/* State 2: Document Workspace (Active State) */}
        {files.length > 0 && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch animate-in">
            
            {/* Left: Document Grid */}
            <div className="flex-1 space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Arrange Order</h2>
                  <p className="text-xs text-gray-500">Drag/drop or click buttons to rearrange the PDF merge sequence.</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all border border-indigo-500/20"
                >
                  <Plus size={13} /> Add More
                </button>
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {files.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-[#8b5cf6]/30 hover:bg-white/[0.03] transition-all"
                  >
                    {/* Position badge */}
                    <span className="w-6 h-6 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-[11px] flex items-center justify-center font-mono font-bold shrink-0">
                      {index + 1}
                    </span>

                    {/* PDF details */}
                    <FileText size={20} className="text-[#8b5cf6] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{entry.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {formatFileSize(entry.size)}
                        {entry.pageCount !== null && ` · ${entry.pageCount} page${entry.pageCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Move operations */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveFile(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveFile(index, "down")}
                        disabled={index === files.length - 1}
                        className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-all shrink-0"
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mt-3">
                  <X size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Summary and Actions Panel (iLovePDF Style Sidebar) */}
            <div className="w-full lg:w-80 bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Merge Summary</h3>
                </div>
                
                <div className="space-y-2.5 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Total Files</span>
                    <span className="font-bold text-white">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Pages</span>
                    <span className="font-bold text-white">{totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Mode</span>
                    <span className="font-bold text-green-400">Browser-Local</span>
                  </div>
                </div>
              </div>

              {/* Action trigger states */}
              <div className="space-y-3">
                {!mergedBlob ? (
                  <button
                    disabled={isMerging}
                    onClick={handleMerge}
                    className="w-full py-4 rounded-xl font-extrabold text-sm bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-all shadow-lg shadow-[#8b5cf6]/10 flex items-center justify-center gap-2"
                  >
                    {isMerging ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Merging PDFs...
                      </>
                    ) : (
                      <>
                        <Merge size={16} />
                        Merge PDF files
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-white">Merge successful!</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{mergedPageCount} pages · {formatFileSize(mergedSize)}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDownload}
                      className="w-full py-4 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={16} />
                      Download merged PDF
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white font-bold transition-all"
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
      <footer className="border-t border-white/5 py-4 px-6 relative z-10 bg-gray-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-600">
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
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
