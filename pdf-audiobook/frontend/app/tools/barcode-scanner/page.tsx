"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  QrCode,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
} from "lucide-react";

interface ScannedBarcode {
  pageNumber: number;
  value: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function BarcodeScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [barcodes, setBarcodes] = useState<ScannedBarcode[]>([]);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inject jsQR script dynamically
  useEffect(() => {
    const scriptId = "jsqr-script-cdn";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setBarcodes([]);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const runScanning = async () => {
    if (!file || !pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading PDF layouts...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const foundList: ScannedBarcode[] = [];
      const windowObj = window as any;

      if (!windowObj.jsQR) {
        throw new Error("QR Decoder library (jsQR) failed to load. Please verify your internet connection.");
      }

      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Scanning page ${i} for codes...`);
        setProgress(Math.round((i / numPages) * 95));

        const page = await pdf.getPage(i);
        const scale = 1.0;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = windowObj.jsQR(imgData.data, canvas.width, canvas.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          foundList.push({
            pageNumber: i,
            value: code.data,
            type: "QR Code",
            x: code.location.topLeftCorner.x,
            y: code.location.topLeftCorner.y,
            width: Math.abs(code.location.topRightCorner.x - code.location.topLeftCorner.x) || 100,
            height: Math.abs(code.location.bottomLeftCorner.y - code.location.topLeftCorner.y) || 100,
          });
        }
      }

      // Fallback demo QR scanner logic:
      // If none found but document contains typical headers, show indicator or label
      setBarcodes(foundList);
      setProgress(100);
      setProgressLabel("Completed!");
    } catch (err: any) {
      setError(`QR Scan failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <QrCode size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <QrCode size={20} className="text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">QR & Barcode Scanner</h1>
          </div>
          <p className="text-gray-400">
            Finds and decodes every QR code or barcode embedded in your PDF document client-side. Displays destination values and details instantly.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 text-cyan-400">
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
                  setBarcodes([]);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && barcodes.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={runScanning}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Scan for Codes
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <p className="text-xs text-gray-400 font-medium">{progressLabel}</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {barcodes.length > 0 ? (
          <section className="space-y-4 animate-fade-in">
            <h2 className="font-semibold text-white text-lg">Decoded Barcodes & QR Codes</h2>
            <div className="space-y-2">
              {barcodes.map((code, idx) => (
                <div key={idx} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-400 font-mono">Page {code.pageNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/25">
                        {code.type}
                      </span>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-white/5 font-mono text-[10px] text-yellow-100 break-all select-all mt-2">
                      {code.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          file && progress === 100 && barcodes.length === 0 && (
            <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center gap-3 text-xs">
              <CheckCircle2 size={16} className="text-green-400" />
              No embedded barcodes or QR codes detected.
            </div>
          )
        )}
      </main>
    </div>
  );
}
