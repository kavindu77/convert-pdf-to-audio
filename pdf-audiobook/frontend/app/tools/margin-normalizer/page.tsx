"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Maximize,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  Settings,
} from "lucide-react";

export default function MarginNormalizer() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [marginSize, setMarginSize] = useState<number>(36); // default 0.5 inch (36 points)
  const [alignCenter, setAlignCenter] = useState<boolean>(true);
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

  const runNormalization = async () => {
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
      
      // Load source PDF in pdf-lib and pdf.js
      const sourcePdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = sourcePdfDoc.getPageCount();

      const outputPdfDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        setProgressLabel(`Normalizing margins for page ${i} of ${totalPages}...`);
        setProgress(Math.round((i / totalPages) * 90));

        // Render page using pdf.js to scan pixels
        const pdfjsPage = await pdfjsDoc.getPage(i);
        const viewport = pdfjsPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        
        // Render
        await pdfjsPage.render({ canvasContext: ctx, viewport }).promise;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Bounding Box Scan: Find Xmin, Ymin, Xmax, Ymax
        let xMin = canvas.width;
        let yMin = canvas.height;
        let xMax = 0;
        let yMax = 0;
        let foundContent = false;

        // Scan pixels for non-white / non-transparent colors
        // Threshold: R, G, B are all > 250 (almost white) or alpha is 0
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // If not white and not transparent
            if (a > 10 && (r < 240 || g < 240 || b < 240)) {
              foundContent = true;
              if (x < xMin) xMin = x;
              if (x > xMax) xMax = x;
              if (y < yMin) yMin = y;
              if (y > yMax) yMax = y;
            }
          }
        }

        // If page is blank, just copy it without changes
        if (!foundContent) {
          const [copiedPage] = await outputPdfDoc.copyPages(sourcePdfDoc, [i - 1]);
          outputPdfDoc.addPage(copiedPage);
          continue;
        }

        // Add padding margin to bounding box coordinates
        const padding = 10;
        xMin = Math.max(0, xMin - padding);
        yMin = Math.max(0, yMin - padding);
        xMax = Math.min(canvas.width, xMax + padding);
        yMax = Math.min(canvas.height, yMax + padding);

        const cropWidth = xMax - xMin;
        const cropHeight = yMax - yMin;

        // Crop canvas to bounding box
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext("2d")!;
        croppedCtx.drawImage(canvas, xMin, yMin, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // Convert cropped canvas to PNG image bytes
        const croppedPngBlob = await new Promise<Blob>((resolve) => {
          croppedCanvas.toBlob((b) => resolve(b!), "image/png");
        });
        const croppedImageBytes = await croppedPngBlob.arrayBuffer();

        // Embed the image in the new PDF
        const embeddedImage = await outputPdfDoc.embedPng(croppedImageBytes);

        // Create page of target size (Standard Letter: 612 x 792 points)
        const letterWidth = 612;
        const letterHeight = 792;
        const newPage = outputPdfDoc.addPage([letterWidth, letterHeight]);

        // Calculate size to fit within margins
        const maxContentWidth = letterWidth - (marginSize * 2);
        const maxContentHeight = letterHeight - (marginSize * 2);

        let fitWidth = cropWidth;
        let fitHeight = cropHeight;

        // Scale down to fit inside the margins if it exceeds target dimensions
        const scaleX = maxContentWidth / cropWidth;
        const scaleY = maxContentHeight / cropHeight;
        const scale = Math.min(scaleX, scaleY);

        if (scale < 1.0) {
          fitWidth = cropWidth * scale;
          fitHeight = cropHeight * scale;
        }

        // Center on the new page, or align
        const xPos = alignCenter ? (letterWidth - fitWidth) / 2 : marginSize;
        const yPos = alignCenter ? (letterHeight - fitHeight) / 2 : letterHeight - marginSize - fitHeight;

        newPage.drawImage(embeddedImage, {
          x: xPos,
          y: yPos,
          width: fitWidth,
          height: fitHeight,
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
      setError(`Margin normalization failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Maximize size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <Maximize size={20} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Margin Normalizer</h1>
          </div>
          <p className="text-gray-400">
            Fix inconsistent margins or scanned crop areas. Trims empty scan borders and centers pages onto standard dimensions for uniform layouts.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-red-500/50 hover:bg-red-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 text-red-400">
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
              <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs flex items-center justify-center font-bold">2</span>
              Margin Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                  <Settings size={14} className="text-red-400" /> Target Margin Size
                </label>
                <select
                  value={marginSize}
                  onChange={(e) => setMarginSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-red-500 text-white font-medium"
                >
                  <option value={0}>None (0 points / Full crop)</option>
                  <option value={18}>Very Narrow (0.25 inch / 18 pts)</option>
                  <option value={36}>Narrow (0.5 inch / 36 pts)</option>
                  <option value={54}>Medium (0.75 inch / 54 pts)</option>
                  <option value={72}>Normal (1.0 inch / 72 pts)</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={alignCenter}
                    onChange={(e) => setAlignCenter(e.target.checked)}
                    className="w-4 h-4 accent-red-500 rounded border-white/10 bg-gray-900"
                  />
                  Center crop output on target canvas
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_normalized.pdf` : "normalized.pdf"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={16} /> Download Normalized PDF
                </a>
              )}
              
              <button
                onClick={runNormalization}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Normalizing...
                  </>
                ) : (
                  "Normalize Margins"
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-red-400" />
                    {progressLabel}
                  </span>
                  <span className="text-red-400 font-semibold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
                {error}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
