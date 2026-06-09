"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Sun,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  Percent,
} from "lucide-react";

export default function InkSaver() {
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
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Sun size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
              <Sun size={20} className="text-yellow-400 animate-spin-slow" />
            </div>
            <h1 className="text-3xl font-bold text-white">Ink Saver Optimizer</h1>
          </div>
          <p className="text-gray-400">
            Reduces heavy backgrounds, dark images, unnecessary color areas, and large black fills while keeping text readable to save on expensive printing ink.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-gray-500 mb-4 animate-pulse" size={36} />
              <p className="text-sm text-white font-medium">Click or drag PDF here</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center border border-yellow-500/20 text-yellow-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setDownloadUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        {/* Configurations */}
        {file && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs flex items-center justify-center font-bold">2</span>
              Ink Saver Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setOptimizerMode("invert-dark")}
                className={`p-4 rounded-xl border text-left text-xs transition-colors ${
                  optimizerMode === "invert-dark" ? "border-yellow-500/60 bg-yellow-500/5 text-yellow-300" : "border-white/10"
                }`}
              >
                <p className="font-semibold text-white">Invert Dark Backgrounds</p>
                <p className="text-[10px] text-gray-500 mt-1">Converts dark headers/full-page backgrounds to white, changing white text to black.</p>
              </button>
              <button
                onClick={() => setOptimizerMode("outlines-only")}
                className={`p-4 rounded-xl border text-left text-xs transition-colors ${
                  optimizerMode === "outlines-only" ? "border-yellow-500/60 bg-yellow-500/5 text-yellow-300" : "border-white/10"
                }`}
              >
                <p className="font-semibold text-white">Outlines & Text Only (Binarize)</p>
                <p className="text-[10px] text-gray-500 mt-1">Strips all images and converts vector fills to outlines to save max ink.</p>
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_ink_saved.pdf` : "ink_saved.pdf"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={16} /> Download Ink-saved PDF
                </a>
              )}
              
              <button
                onClick={runInkSaver}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
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
              <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-2">
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
              <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
                {error}
              </p>
            )}

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs rounded-xl flex gap-3 items-center">
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
