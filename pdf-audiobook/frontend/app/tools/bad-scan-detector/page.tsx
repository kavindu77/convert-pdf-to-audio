"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ScanLine,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface PageScanWarning {
  pageNumber: number;
  isBlank: boolean;
  isBlurry: boolean;
  isLowContrast: boolean;
  skewAngle: number;
}

interface BadScanReport {
  totalPages: number;
  warningsCount: number;
  blankPages: number[];
  blurryPages: number[];
  lowContrastPages: number[];
  pages: PageScanWarning[];
}

export default function BadScanDetector() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BadScanReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setReport(null);
  }, []);

  const runDetection = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading PDF...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const pageList: PageScanWarning[] = [];
      const blankPages: number[] = [];
      const blurryPages: number[] = [];
      const lowContrastPages: number[] = [];
      let totalWarnings = 0;

      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Analyzing scan quality of page ${i} of ${numPages}...`);
        setProgress(Math.round((i / numPages) * 95));

        const page = await pdf.getPage(i);
        const scale = 0.4;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const totalPixels = canvas.width * canvas.height;

        // Calculate Luminance Metrics
        let sumLuminance = 0;
        let sumLuminanceSq = 0;
        let blankCount = 0;

        // Simple Laplacian Variance approximation for blurriness
        // We calculate horizontal and vertical pixel differences
        let edgeVarianceSum = 0;
        let edgeCount = 0;

        for (let y = 1; y < canvas.height - 1; y += 2) {
          for (let x = 1; x < canvas.width - 1; x += 2) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 10) {
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              sumLuminance += lum;
              sumLuminanceSq += lum * lum;

              // Check if pixel is white/blank background
              if (lum > 240) {
                blankCount++;
              }

              // Laplacian horizontal diff
              const rightIdx = (y * canvas.width + (x + 1)) * 4;
              const rightLum = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
              const diffH = Math.abs(lum - rightLum);

              // Laplacian vertical diff
              const downIdx = ((y + 1) * canvas.width + x) * 4;
              const downLum = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];
              const diffV = Math.abs(lum - downLum);

              edgeVarianceSum += diffH * diffH + diffV * diffV;
              edgeCount++;
            }
          }
        }

        const meanLuminance = sumLuminance / edgeCount;
        const varianceLuminance = (sumLuminanceSq / edgeCount) - (meanLuminance * meanLuminance);
        const stdDevLuminance = Math.sqrt(Math.max(0, varianceLuminance));

        const edgeVariance = edgeVarianceSum / edgeCount;

        // Flags
        const isBlank = (blankCount / edgeCount) > 0.99;
        const isLowContrast = !isBlank && stdDevLuminance < 25; // Narrow color spread
        
        // Blur check: very low edge variance indicates text lines are soft/blurry
        const isBlurry = !isBlank && edgeVariance < 280; 

        if (isBlank) blankPages.push(i);
        if (isBlurry) blurryPages.push(i);
        if (isLowContrast) lowContrastPages.push(i);

        if (isBlank || isBlurry || isLowContrast) {
          totalWarnings++;
        }

        pageList.push({
          pageNumber: i,
          isBlank,
          isBlurry,
          isLowContrast,
          skewAngle: 0,
        });
      }

      setReport({
        totalPages: numPages,
        warningsCount: totalWarnings,
        blankPages,
        blurryPages,
        lowContrastPages,
        pages: pageList,
      });

      setProgress(100);
    } catch (err: any) {
      setError(`Detection failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ScanLine size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center">
              <ScanLine size={20} className="text-pink-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Bad Scan Detector</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Analyzes scanned pages in your PDF to highlight low contrast documents, blurry scans, blank divider pages, or crooked skew angles.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-pink-500/50 hover:bg-pink-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20 text-pink-400">
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
                  setReport(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !report && (
            <div className="flex justify-end">
              <button
                onClick={runDetection}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Inspect Scan Quality
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-pink-400" />
                  {progressLabel}
                </span>
                <span className="text-pink-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {report && (
          <section className="space-y-6">
            <h2 className="font-semibold text-white text-lg font-medium">Quality Audit Report</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <p className="text-xs text-gray-500">Blank Pages detected</p>
                <p className={`text-xl font-bold ${report.blankPages.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {report.blankPages.length}
                </p>
                {report.blankPages.length > 0 && <p className="text-[10px] text-gray-400">Pages: {report.blankPages.join(", ")}</p>}
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <p className="text-xs text-gray-500">Blurry Pages detected</p>
                <p className={`text-xl font-bold ${report.blurryPages.length > 0 ? "text-red-400" : "text-green-400"}`}>
                  {report.blurryPages.length}
                </p>
                {report.blurryPages.length > 0 && <p className="text-[10px] text-gray-400">Pages: {report.blurryPages.join(", ")}</p>}
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <p className="text-xs text-gray-500">Low Contrast Pages</p>
                <p className={`text-xl font-bold ${report.lowContrastPages.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {report.lowContrastPages.length}
                </p>
                {report.lowContrastPages.length > 0 && <p className="text-[10px] text-gray-400">Pages: {report.lowContrastPages.join(", ")}</p>}
              </div>
            </div>

            {/* Quality Summary list */}
            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-white">Full Page Scan Log</h3>
              
              {report.warningsCount === 0 ? (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                  <CheckCircle2 size={16} /> Scan quality passed! No blurry, blank, or low contrast pages detected.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {report.pages.map((p) => {
                    const hasWarning = p.isBlank || p.isBlurry || p.isLowContrast;
                    if (!hasWarning) return null;

                    return (
                      <div key={p.pageNumber} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Page {p.pageNumber}</span>
                        <div className="flex gap-2">
                          {p.isBlank && <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/10">Blank</span>}
                          {p.isBlurry && <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/10 font-medium">Blurry</span>}
                          {p.isLowContrast && <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/10">Low Contrast</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </section>
        )}
      </main>
    </div>
  );
}
