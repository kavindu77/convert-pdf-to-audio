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

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface WatermarkResult {
  originalSize: number;
  watermarkedSize: number;
  pageCount: number;
  blob: Blob;
  fileName: string;
}

interface WatermarkColor {
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

const PRESET_COLORS: WatermarkColor[] = [
  { name: "Gray", hex: "#9ca3af", r: 0.612, g: 0.639, b: 0.686 },
  { name: "Red", hex: "#ef4444", r: 0.937, g: 0.267, b: 0.267 },
  { name: "Blue", hex: "#3b82f6", r: 0.231, g: 0.510, b: 0.965 },
  { name: "Green", hex: "#22c55e", r: 0.133, g: 0.773, b: 0.369 },
];

type WatermarkPosition = "center" | "top" | "bottom";

export default function WatermarkPdfPage() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Watermark config
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.15);
  const [rotation, setRotation] = useState(-45);
  const [selectedColor, setSelectedColor] = useState<WatermarkColor>(PRESET_COLORS[0]);
  const [position, setPosition] = useState<WatermarkPosition>("center");

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

  // Live preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Draw page background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Draw fake content lines
    ctx.fillStyle = "#e5e7eb";
    const lineStartY = 40;
    const lineHeight = 14;
    const lineGap = 8;
    for (let i = 0; i < 18; i++) {
      const y = lineStartY + i * (lineHeight + lineGap);
      const width = W - 60 - (i % 3 === 2 ? 80 : i % 5 === 0 ? 40 : 0);
      ctx.fillRect(30, y, width, lineHeight);
    }

    // Draw watermark
    if (!watermarkText.trim()) return;

    ctx.save();

    // Position
    let cx = W / 2;
    let cy = H / 2;
    if (position === "top") cy = H * 0.25;
    else if (position === "bottom") cy = H * 0.75;

    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Scale font for preview (canvas is 280x396)
    const scaledFontSize = fontSize * 0.55;
    ctx.font = `bold ${scaledFontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = opacity;
    ctx.fillStyle = selectedColor.hex;

    ctx.fillText(watermarkText, 0, 0);
    ctx.restore();
  }, [file, watermarkText, fontSize, opacity, rotation, selectedColor, position]);

  const handleApplyWatermark = async () => {
    if (!file || !watermarkText.trim()) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      // Step 1: Read file
      const arrayBuffer = await file.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      setProgress(15);
      setProgressLabel("Loading pdf-lib...");

      // Step 2: Dynamic import pdf-lib
      const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
      setProgress(30);
      setProgressLabel("Parsing PDF...");

      // Step 3: Load the PDF
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      setProgress(40);
      setProgressLabel(`Applying watermark to ${totalPages} page${totalPages > 1 ? "s" : ""}...`);

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Apply watermark to each page
      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = fontSize;

        let x: number;
        let y: number;

        if (position === "center") {
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
        } else if (position === "top") {
          x = (width - textWidth) / 2;
          y = height * 0.75 - textHeight / 2;
        } else {
          x = (width - textWidth) / 2;
          y = height * 0.25 - textHeight / 2;
        }

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(selectedColor.r, selectedColor.g, selectedColor.b),
          opacity,
          rotate: degrees(rotation),
        });

        const pageProgress = 40 + Math.round(((i + 1) / totalPages) * 45);
        setProgress(pageProgress);
        setProgressLabel(`Watermarking page ${i + 1} of ${totalPages}...`);
      }

      setProgress(90);
      setProgressLabel("Saving PDF...");

      // Step 4: Save
      const watermarkedBytes = await pdfDoc.save();
      const watermarkedSize = watermarkedBytes.byteLength;

      const blob = new Blob([watermarkedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file.name.replace(/\.pdf$/i, "");

      setProgress(100);
      setProgressLabel("Complete!");

      setResult({
        originalSize,
        watermarkedSize,
        pageCount: totalPages,
        blob,
        fileName: `${baseName}-watermarked.pdf`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Watermark failed: ${message}`);
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
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsProcessing(false);
    setWatermarkText("CONFIDENTIAL");
    setFontSize(60);
    setOpacity(0.15);
    setRotation(-45);
    setSelectedColor(PRESET_COLORS[0]);
    setPosition("center");
    if (inputRef.current) inputRef.current.value = "";
  };

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

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
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
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
              <Droplets size={20} className="text-sky-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Add Watermark</h1>
          </div>
          <p className="text-slate-500">
            Add a custom text watermark to every page of your PDF. Configure
            text, size, opacity, rotation, color, and position. Everything runs
            in your browser — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs flex items-center justify-center">
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
                  ? "border-sky-400 bg-sky-500/10"
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
                <FileText size={24} className="text-sky-400" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatSize(file.size)}
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
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Configure Watermark */}
        {file && !result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs flex items-center justify-center">
                2
              </span>
              Configure Watermark
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column: Controls */}
              <div className="space-y-5">
                {/* Text input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 text-slate-900 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 transition-all"
                  />
                </div>

                {/* Font size slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-500">
                      Font Size
                    </label>
                    <span className="text-sm text-sky-400 font-mono">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={120}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>24px</span>
                    <span>120px</span>
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-500">
                      Opacity
                    </label>
                    <span className="text-sm text-sky-400 font-mono">
                      {(opacity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={opacity * 100}
                    onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>5%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* Rotation slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-500">
                      Rotation
                    </label>
                    <span className="text-sm text-sky-400 font-mono">
                      {rotation}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>-90°</span>
                    <span>0°</span>
                    <span>90°</span>
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                          selectedColor.name === color.name
                            ? "border-sky-400/60 bg-sky-500/10 text-slate-900"
                            : "border-slate-200 bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">
                    Position
                  </label>
                  <div className="flex gap-2">
                    {(["top", "center", "bottom"] as WatermarkPosition[]).map(
                      (pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setPosition(pos)}
                          className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm capitalize ${
                            position === pos
                              ? "border-sky-400/60 bg-sky-500/10 text-slate-900"
                              : "border-slate-200 bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600"
                          }`}
                        >
                          {pos}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Live Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500">
                  Preview
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 border border-slate-200 p-4 flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={280}
                    height={396}
                    className="rounded-lg shadow-lg"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              </div>
            </div>

            {/* Apply button or progress */}
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-sky-400"
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
                        "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyWatermark}
                disabled={isProcessing || !watermarkText.trim()}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0ea5e9" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0284c7")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0ea5e9")
                }
              >
                <Droplets size={20} />
                Apply Watermark
              </button>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">Watermark applied successfully!</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Pages
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {result.pageCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Original
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatSize(result.originalSize)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Watermarked
                </p>
                <p className="text-xl font-bold text-sky-400">
                  {formatSize(result.watermarkedSize)}
                </p>
              </div>
            </div>

            {/* Watermark summary */}
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-4 space-y-2">
              <p className="text-sm font-medium text-sky-300">
                Watermark Settings Applied
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Text</span>
                  <span className="text-slate-600 font-mono truncate max-w-[140px]">
                    {watermarkText}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Font Size</span>
                  <span className="text-slate-600 font-mono">{fontSize}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Opacity</span>
                  <span className="text-slate-600 font-mono">
                    {(opacity * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rotation</span>
                  <span className="text-slate-600 font-mono">{rotation}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Color</span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: selectedColor.hex }}
                    />
                    {selectedColor.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Position</span>
                  <span className="text-slate-600 capitalize">{position}</span>
                </div>
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#0ea5e9" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#0284c7")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#0ea5e9")
              }
            >
              <Download size={20} />
              Download Watermarked PDF
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Watermark another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
