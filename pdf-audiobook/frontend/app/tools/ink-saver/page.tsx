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
  Percent,
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

export default function InkSaver() {
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [optimizerMode, setOptimizerMode] = useState<string>("invert-dark");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setDownloadUrl(null);
  }, []);

  const runInkSaver = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading PDF...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      
      const sourcePdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = sourcePdfDoc.getPageCount();

      const outputPdfDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        setProgressLabel(`Optimizing page ${i} of ${totalPages} layouts...`);
        setProgress(Math.round((i / totalPages) * 90));

        const pdfjsPage = await pdfjsDoc.getPage(i);
        const viewport = pdfjsPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        
        await pdfjsPage.render({ canvasContext: ctx, viewport }).promise;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Apply Pixel Inversion / Thresholding for Ink Saver
        // 1. invert-dark: Inverts dark backgrounds to white and makes dark text black
        // 2. outlines-only: Binarizes images/fills to black outlines on white canvas
        for (let idx = 0; idx < data.length; idx += 4) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 10) {
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if (optimizerMode === "invert-dark") {
              // If pixel is very dark (background fill), make it white
              if (luminance < 80) {
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
              } else if (luminance > 220 && luminance < 255) {
                // If text is white/light, make it black (so it's readable on white bg)
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
              }
            } else if (optimizerMode === "outlines-only") {
              // Binarize: if pixel is dark (text), make it pure black, otherwise pure white
              if (luminance < 130) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
              } else {
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Convert optimized canvas to PNG image bytes
        const optimizedPngBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/png");
        });
        const optimizedImageBytes = await optimizedPngBlob.arrayBuffer();

        // Embed the image in the new PDF
        const embeddedImage = await outputPdfDoc.embedPng(optimizedImageBytes);

        // Match original page sizes
        const originalPage = sourcePdfDoc.getPage(i - 1);
        const { width: pWidth, height: pHeight } = originalPage.getSize();
        
        const newPage = outputPdfDoc.addPage([pWidth, pHeight]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
        });
      }

      setProgressLabel("Saving output PDF...");
      setProgress(95);
      
      const savedBytes = await outputPdfDoc.save();
      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setProgressLabel("Complete!");
    } catch (err: any) {
      setError(`Ink saving optimization failed: ${err.message || err}`);
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
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-250 flex items-center justify-center">
              <Sun size={20} className="text-yellow-400 animate-spin-slow" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Ink Saver Optimizer</h1>
          </div>
          <p className="text-slate-500">
            Reduces heavy backgrounds, dark images, unnecessary color areas, and large black fills while keeping text readable to save on expensive printing ink.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-yellow-500/50 hover:bg-yellow-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-250 text-yellow-400">
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
                  setDownloadUrl(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        {/* Configurations */}
        {file && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs flex items-center justify-center font-bold">2</span>
              Ink Saver Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setOptimizerMode("invert-dark")}
                className={`p-4 rounded-xl border text-left text-xs transition-colors ${
                  optimizerMode === "invert-dark" ? "border-yellow-500/60 bg-yellow-500/5 text-yellow-800" : "border-slate-200"
                }`}
              >
                <p className="font-semibold text-slate-900">Invert Dark Backgrounds</p>
                <p className="text-[10px] text-slate-400 mt-1">Converts dark headers/full-page backgrounds to white, changing white text to black.</p>
              </button>
              <button
                onClick={() => setOptimizerMode("outlines-only")}
                className={`p-4 rounded-xl border text-left text-xs transition-colors ${
                  optimizerMode === "outlines-only" ? "border-yellow-500/60 bg-yellow-500/5 text-yellow-800" : "border-slate-200"
                }`}
              >
                <p className="font-semibold text-slate-900">Outlines & Text Only (Binarize)</p>
                <p className="text-[10px] text-slate-400 mt-1">Strips all images and converts vector fills to outlines to save max ink.</p>
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200/60 gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_ink_saved.pdf` : "ink_saved.pdf"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={16} /> Download Ink-saved PDF
                </a>
              )}
              
              <button
                onClick={runInkSaver}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Optimizing...
                  </>
                ) : (
                  "Optimize Ink Usage"
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-yellow-400" />
                    {progressLabel}
                  </span>
                  <span className="text-yellow-400 font-semibold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
                {error}
              </p>
            )}

            <div className="p-4 bg-yellow-50 border border-yellow-250 text-yellow-800 text-xs rounded-xl flex gap-3 items-center">
              <Percent className="shrink-0 text-yellow-400" size={16} />
              <p className="leading-relaxed font-normal">
                This optimizer runs entirely client-side. Average ink savings: <strong>40% to 75%</strong> depending on the density of background colors and images in your PDF.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
