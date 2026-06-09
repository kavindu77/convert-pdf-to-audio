"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Palette,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  DollarSign,
} from "lucide-react";

interface PageColorInfo {
  pageNumber: number;
  type: "color" | "bw";
  colorPixelPercentage: number;
  thumbnailUrl: string;
}

interface ColorDetectorReport {
  totalPages: number;
  colorPagesCount: number;
  bwPagesCount: number;
  pages: PageColorInfo[];
}

export default function ColorDetector() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ColorDetectorReport | null>(null);
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
    setProgressLabel("Loading PDF document...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const pageReports: PageColorInfo[] = [];
      let colorPagesCount = 0;
      let bwPagesCount = 0;

      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Analyzing page ${i} of ${numPages} pixels...`);
        setProgress(Math.round((i / numPages) * 95));

        const page = await pdf.getPage(i);
        const scale = 0.4; // Small scale for fast analysis
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const totalPixels = canvas.width * canvas.height;
        
        let colorPixels = 0;
        const threshold = 15; // color deviation threshold

        // Iterate pixel buffer
        for (let idx = 0; idx < data.length; idx += 4) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 10) {
            // Check if deviation between RGB channels exceeds threshold
            const devRG = Math.abs(r - g);
            const devGB = Math.abs(g - b);
            const devRB = Math.abs(r - b);

            if (devRG > threshold || devGB > threshold || devRB > threshold) {
              colorPixels++;
            }
          }
        }

        const colorPixelPercentage = (colorPixels / totalPixels) * 100;
        
        // If more than 0.5% of pixels are colored, flag page as color
        const type = colorPixelPercentage > 0.5 ? "color" : "bw";
        if (type === "color") colorPagesCount++;
        else bwPagesCount++;

        // Convert page preview to thumbnail URL
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.6);

        pageReports.push({
          pageNumber: i,
          type,
          colorPixelPercentage,
          thumbnailUrl,
        });
      }

      setReport({
        totalPages: numPages,
        colorPagesCount,
        bwPagesCount,
        pages: pageReports,
      });
      setProgress(100);
    } catch (err: any) {
      setError(`Detection failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Heuristic printing savings calculator
  const calculateSavings = () => {
    if (!report) return 0;
    const colorCost = 0.40; // 40 cents per color print
    const bwCost = 0.06; // 6 cents per bw print

    const standardColorPrintCost = report.totalPages * colorCost;
    const splitPrintCost = (report.colorPagesCount * colorCost) + (report.bwPagesCount * bwCost);

    return Math.max(0, standardColorPrintCost - splitPrintCost);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Palette size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">DocuSafe PDF</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Palette size={20} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Color Page Detector</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Scans document pages to detect which pages have colored content vs black-and-white. Helps you choose to print color pages separately and save on printing costs.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20 text-emerald-400">
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Scan Page Colors
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  {progressLabel}
                </span>
                <span className="text-emerald-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
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
            <h2 className="font-semibold text-white text-lg">Scan Results</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Total Pages</p>
                <p className="text-2xl font-bold text-white">{report.totalPages}</p>
              </div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center space-y-1">
                <p className="text-xs text-emerald-400">Color Pages</p>
                <p className="text-2xl font-bold text-emerald-300">{report.colorPagesCount}</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">B&W Pages</p>
                <p className="text-2xl font-bold text-white">{report.bwPagesCount}</p>
              </div>
              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl text-center space-y-1 flex flex-col items-center justify-center">
                <p className="text-xs text-green-400 flex items-center gap-0.5 justify-center"><DollarSign size={12} /> Printing Savings</p>
                <p className="text-xl font-extrabold text-green-300">${calculateSavings().toFixed(2)}</p>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-white">Color Mapping Layout</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {report.pages.map((p) => (
                  <div
                    key={p.pageNumber}
                    className={`relative p-2 rounded-xl border-2 flex flex-col items-center gap-2 bg-gray-900 ${
                      p.type === "color" ? "border-emerald-500/60" : "border-white/10"
                    }`}
                  >
                    <img
                      src={p.thumbnailUrl}
                      alt={`Page ${p.pageNumber}`}
                      className="w-full rounded-lg max-h-36 object-contain"
                    />
                    <div className="flex items-center justify-between w-full text-[10px] pt-1">
                      <span className="text-gray-400 font-medium">Page {p.pageNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                        p.type === "color" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-500"
                      }`}>
                        {p.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
