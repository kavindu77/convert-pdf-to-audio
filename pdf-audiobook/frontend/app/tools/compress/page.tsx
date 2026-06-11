"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UsageGateModal from "../../components/UsageGateModal";
import { verifyUsageAndGetToken, recordUsageSuccess } from "../../utils/usageClient";
import {
  Archive,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
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
  Scissors,
  Merge,
  RotateCw,
  Eye,
  EyeOff,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  blob: Blob;
  fileName: string;
}

export default function CompressPdfPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // App header states (synced with localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("File too large (max 100 MB).");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleCompress = async () => {
    if (!file) return;

    setIsCompressing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      setProgress(20);
      setProgressLabel("Loading document...");

      const { PDFDocument } = await import("pdf-lib");
      setProgress(35);
      setProgressLabel("Parsing PDF structure...");

      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      const fileSizeMb = originalSize / (1024 * 1024);

      // Perform server-side access check & token creation
      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "compress",
        toolName: "Compress PDF",
        fileSizeMb,
        pageCount,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsCompressing(false);
        return;
      }

      setProgress(55);
      setProgressLabel("Stripping metadata...");

      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");
      setProgress(70);
      setProgressLabel("Rewriting PDF...");

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
      });
      setProgress(85);
      setProgressLabel("Finalizing...");

      // Record successful execution
      const recordSuccess = await recordUsageSuccess({
        jobToken: checkResult.jobToken!,
        jobId: checkResult.jobId!,
        toolSlug: "compress",
        fileSizeMb: compressedBytes.byteLength / (1024 * 1024),
        pageCount,
        fileCount: 1,
      });

      if (!recordSuccess) {
        throw new Error("Failed to record usage event. Please try again.");
      }

      setProgress(100);
      setProgressLabel("Complete!");

      const compressedSize = compressedBytes.byteLength;
      const savingsPercent =
        originalSize > 0
          ? ((originalSize - compressedSize) / originalSize) * 100
          : 0;

      const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResult({
        originalSize,
        compressedSize,
        savingsPercent,
        blob,
        fileName: `${baseName}-compressed.pdf`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Compression failed: ${message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsCompressing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const getSavingsColor = (percent: number) => {
    if (percent > 10) return { text: "text-green-600", bg: "bg-green-500", border: "border-green-100", bgCard: "bg-green-50/50" };
    if (percent >= 1) return { text: "text-amber-600", bg: "bg-amber-500", border: "border-amber-100", bgCard: "bg-amber-50/50" };
    return { text: "text-slate-500", bg: "bg-slate-400", border: "border-slate-200", bgCard: "bg-slate-50/50" };
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-cyan-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-cyan-50/90 backdrop-blur-md border-4 border-dashed border-cyan-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-cyan-600 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-slate-900">Drop PDF anywhere to upload</p>
          <p className="text-sm text-cyan-500/80 mt-1">Compress locally in your browser</p>
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
            <Link href="/tools/split" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Split PDF</Link>
            <Link href="/tools/compress" className="text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] border-b-2 border-cyan-500 pb-0.5">Compress PDF</Link>
            
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
                    <Link href="/tools/compress" className="text-[11px] text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Archive size={12} className="text-[#06b6d4]" /> Compress PDF</Link>
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
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto shadow-inner shadow-cyan-500/5">
                <Archive size={20} className="text-cyan-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Compress PDF file</h1>
              <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                Reduce file size while optimizing for maximal PDF quality.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={onFileSelect}
                className="hidden"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="group relative px-9 py-4 bg-[#06b6d4] hover:bg-[#0891b2] text-white font-extrabold text-base rounded-2xl transition-all duration-300 shadow-md shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 shrink-0"
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
            <div className="flex-1 space-y-4 bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-center shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Selected PDF File</h2>
                  <p className="text-xs text-slate-400">Ready to compress and optimize layout.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-lg text-xs font-bold text-slate-400 transition-all border border-slate-200/50"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              {/* Selected File Card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 relative overflow-hidden max-w-xl mx-auto w-full">
                <FileText size={32} className="text-cyan-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-850 text-xs truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs mt-3 max-w-xl mx-auto w-full animate-in">
                  <X size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Actions / Results Panel (Sidebar style) */}
            <div className="w-full lg:w-76 bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-5 shadow-sm text-slate-705">
              
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Compression Summary</h3>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Compress Mode</span>
                    <span className="font-bold text-cyan-600">Local Browser</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Weight</span>
                    <span className="font-bold text-slate-800">{formatSize(file.size)}</span>
                  </div>
                </div>
              </div>

              {/* Compression actions */}
              <div className="space-y-2.5">
                {!result ? (
                  <div className="space-y-4">
                    {isCompressing ? (
                      <div className="space-y-2.5 animate-in">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-cyan-500" /> {progressLabel}</span>
                          <span className="font-mono font-bold">{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className="h-full rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${progress}%`,
                              background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleCompress}
                        className="w-full py-3 rounded-xl font-extrabold text-sm bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-2"
                      >
                        <Archive size={15} />
                        Compress PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-slate-900">Optimize Complete!</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Stripped structural trackers.</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200/60 p-3 shadow-inner">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Original:</span>
                        <span className="font-bold text-slate-655">{formatSize(result.originalSize)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Compressed:</span>
                        <span className="font-bold text-cyan-600">{formatSize(result.compressedSize)}</span>
                      </div>
                      
                      {(() => {
                        const colors = getSavingsColor(result.savingsPercent);
                        const displayPercent = Math.max(0, result.savingsPercent);
                        return (
                          <div className={`mt-2 border-t border-slate-200 pt-2 flex items-center justify-between text-xs font-bold ${colors.text}`}>
                            <span className="flex items-center gap-1.5"><TrendingDown size={14} /> Size Reduced</span>
                            <span>{displayPercent.toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3.5 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={15} />
                      Download compressed PDF
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2 rounded-xl border border-slate-200 text-xs text-slate-400 hover:text-slate-655 hover:bg-slate-50 font-bold transition-all"
                    >
                      Compress another PDF
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
