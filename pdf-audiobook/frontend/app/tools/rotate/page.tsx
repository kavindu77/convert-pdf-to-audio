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
  FlipHorizontal,
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
  RotateCcw,
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

// pdfjs-dist imported dynamically in renderThumbnails

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface PageInfo {
  pageNumber: number;
  rotation: number; // cumulative rotation in degrees (0, 90, 180, 270)
  thumbnailUrl: string;
  selected: boolean;
}

interface RotateResult {
  blob: Blob;
  fileName: string;
  size: number;
}

export default function RotatePdfPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [result, setResult] = useState<RotateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup thumbnail URLs on unmount or reset
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderThumbnails = useCallback(async (data: Uint8Array) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const newPages: PageInfo[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 0.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });
      const url = URL.createObjectURL(blob);

      newPages.push({
        pageNumber: i,
        rotation: 0,
        thumbnailUrl: url,
        selected: false,
      });
    }

    return newPages;
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      if (
        f.type !== "application/pdf" &&
        !f.name.toLowerCase().endsWith(".pdf")
      ) {
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
      setPages([]);
      setIsLoading(true);

      try {
        const arrayBuffer = await f.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);

        const renderedPages = await renderThumbnails(bytes);
        setPages(renderedPages);
      } catch {
        setError(
          "Failed to read PDF. The file may be corrupted or password-protected."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [renderThumbnails]
  );

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

  // ── Selection ──────────────────────────────────────────────────
  const toggleSelectPage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const allSelected = pages.length > 0 && pages.every((p) => p.selected);
  const someSelected = pages.some((p) => p.selected);

  const toggleSelectAll = () => {
    const newVal = !allSelected;
    setPages((prev) => prev.map((p) => ({ ...p, selected: newVal })));
  };

  // ── Rotation ───────────────────────────────────────────────────
  const rotatePage = (pageNumber: number, degrees: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber
          ? { ...p, rotation: (p.rotation + degrees + 360) % 360 }
          : p
      )
    );
  };

  const rotateSelected = (degrees: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.selected
          ? { ...p, rotation: (p.rotation + degrees + 360) % 360 }
          : p
      )
    );
  };

  const hasRotations = pages.some((p) => p.rotation !== 0);

  // ── Apply and Download ─────────────────────────────────────────
  const handleApplyRotation = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      const arrayBuffer = pdfBytes.buffer as ArrayBuffer;
      setProgress(15);
      setProgressLabel("Loading document...");

      const { PDFDocument, degrees } = await import("pdf-lib");
      setProgress(30);
      setProgressLabel("Parsing PDF structure...");

      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(50);
      setProgressLabel("Applying rotations...");

      const pdfPages = pdfDoc.getPages();
      const totalPages = pdfPages.length;

      for (let i = 0; i < totalPages; i++) {
        const pageInfo = pages[i];
        if (pageInfo && pageInfo.rotation !== 0) {
          const currentRotation = pdfPages[i].getRotation().angle;
          pdfPages[i].setRotation(
            degrees((currentRotation + pageInfo.rotation) % 360)
          );
        }
        setProgress(50 + Math.round(((i + 1) / totalPages) * 35));
      }

      setProgressLabel("Saving PDF...");
      const rotatedBytes = await pdfDoc.save();
      setProgress(95);
      setProgressLabel("Finalizing...");

      const blob = new Blob([rotatedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file!.name.replace(/\.pdf$/i, "");

      setProgress(100);
      setProgressLabel("Complete!");

      setResult({
        blob,
        fileName: `${baseName}-rotated.pdf`,
        size: rotatedBytes.byteLength,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Rotation failed: ${message}`);
    } finally {
      setIsProcessing(false);
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
    pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    setFile(null);
    setPdfBytes(null);
    setPages([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsProcessing(false);
    setIsLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Header */}
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

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
              <RotateCw size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Rotate PDF</h1>
          </div>
          <p className="text-slate-500">
            Rotate individual pages or all pages of your PDF. Preview each page,
            choose your rotation, and download the result. Everything runs in
            your browser — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${
                isDragActive
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200"
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-purple-400" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatSize(file.size)} · {pages.length} page
                    {pages.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-medium">
                  Drop your PDF here
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  or click to browse · max 100 MB
                </p>
              </>
            )}
          </div>

          {/* Loading thumbnails indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 pt-2">
              <Loader2 size={18} className="animate-spin text-purple-400" />
              <span className="text-sm text-slate-500">
                Rendering page previews…
              </span>
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Configure Rotation */}
        {pages.length > 0 && !result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
                2
              </span>
              Select &amp; Rotate Pages
            </h2>

            {/* Bulk controls */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200">
              {/* Select All */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400/50 focus:ring-offset-0 accent-purple-500"
                />
                <span className="text-sm text-slate-600">Select All</span>
              </label>

              <div className="w-px h-6 bg-white/10" />

              {/* Bulk rotate buttons */}
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Rotate selected:
              </span>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(-90)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-slate-50 border border-slate-200 text-slate-600 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 90° counter-clockwise"
              >
                <RotateCcw size={14} />
                90° CCW
              </button>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(90)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-slate-50 border border-slate-200 text-slate-600 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 90° clockwise"
              >
                <RotateCw size={14} />
                90° CW
              </button>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(180)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-slate-50 border border-slate-200 text-slate-600 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 180°"
              >
                <FlipHorizontal size={14} />
                180°
              </button>
            </div>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className={`group relative rounded-xl border p-2 transition-all cursor-pointer ${
                    page.selected
                      ? "border-purple-400/60 bg-purple-500/10"
                      : "border-slate-200 bg-slate-50 border border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => toggleSelectPage(page.pageNumber)}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={page.selected}
                      onChange={() => toggleSelectPage(page.pageNumber)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400/50 focus:ring-offset-0 accent-purple-500"
                    />
                  </div>

                  {/* Rotation badge */}
                  {page.rotation !== 0 && (
                    <div className="absolute top-3 right-3 z-10 px-1.5 py-0.5 rounded-md bg-purple-500/80 text-[10px] font-bold text-slate-900">
                      {page.rotation}°
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="flex items-center justify-center overflow-hidden rounded-lg bg-gray-900 aspect-[3/4] mb-2">
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="max-w-full max-h-full object-contain transition-transform duration-300"
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Page number */}
                  <p className="text-xs text-center text-slate-500 mb-2">
                    Page {page.pageNumber}
                  </p>

                  {/* Per-page rotate controls */}
                  <div
                    className="flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, -90)}
                      className="p-1.5 rounded-md border border-slate-200 bg-slate-50 border border-slate-200 text-slate-500 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 90° CCW"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, 90)}
                      className="p-1.5 rounded-md border border-slate-200 bg-slate-50 border border-slate-200 text-slate-500 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 90° CW"
                    >
                      <RotateCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, 180)}
                      className="p-1.5 rounded-md border border-slate-200 bg-slate-50 border border-slate-200 text-slate-500 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 180°"
                    >
                      <FlipHorizontal size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply button or progress */}
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-purple-400"
                  />
                  <span className="text-sm text-slate-600">
                    {progressLabel}
                  </span>
                  <span className="ml-auto text-sm text-slate-400">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #a855f7, #c084fc)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyRotation}
                disabled={!hasRotations}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#a855f7" }}
                onMouseEnter={(e) => {
                  if (hasRotations)
                    e.currentTarget.style.backgroundColor = "#9333ea";
                }}
                onMouseLeave={(e) => {
                  if (hasRotations)
                    e.currentTarget.style.backgroundColor = "#a855f7";
                }}
              >
                <RotateCw size={20} />
                Apply Rotation &amp; Generate PDF
              </button>
            )}

            {!hasRotations && (
              <p className="text-xs text-slate-400 text-center">
                Rotate at least one page to enable the button.
              </p>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">Rotation complete!</span>
            </div>

            {/* File info */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4 flex items-center gap-4">
              <FileText size={24} className="text-purple-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate">
                  {result.fileName}
                </p>
                <p className="text-sm text-slate-500">
                  {formatSize(result.size)} ·{" "}
                  {pages.filter((p) => p.rotation !== 0).length} page
                  {pages.filter((p) => p.rotation !== 0).length !== 1
                    ? "s"
                    : ""}{" "}
                  rotated
                </p>
              </div>
            </div>

            {/* Rotation summary */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                Rotation Summary
              </p>
              <div className="flex flex-wrap gap-2">
                {pages
                  .filter((p) => p.rotation !== 0)
                  .map((p) => (
                    <span
                      key={p.pageNumber}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/15 border border-purple-400/20 text-xs text-purple-300"
                    >
                      Page {p.pageNumber}: {p.rotation}°
                    </span>
                  ))}
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#a855f7" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#9333ea")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#a855f7")
              }
            >
              <Download size={20} />
              Download Rotated PDF
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
            >
              Rotate another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
