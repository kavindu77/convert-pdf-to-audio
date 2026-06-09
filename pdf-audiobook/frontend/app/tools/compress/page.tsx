"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Archive,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  TrendingDown,
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
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Step 1: Read file
      const arrayBuffer = await file.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      setProgress(20);
      setProgressLabel("Loading document...");

      // Step 2: Dynamic import pdf-lib
      const { PDFDocument } = await import("pdf-lib");
      setProgress(35);
      setProgressLabel("Parsing PDF structure...");

      // Step 3: Load the PDF
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(55);
      setProgressLabel("Stripping metadata...");

      // Step 4: Strip metadata
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");
      setProgress(70);
      setProgressLabel("Rewriting PDF...");

      // Step 5: Save with optimization
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
      });
      setProgress(90);
      setProgressLabel("Finalizing...");

      const compressedSize = compressedBytes.byteLength;
      const savingsPercent =
        originalSize > 0
          ? ((originalSize - compressedSize) / originalSize) * 100
          : 0;

      const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const baseName = file.name.replace(/\.pdf$/i, "");

      setProgress(100);
      setProgressLabel("Complete!");

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
    if (percent > 10) return { text: "text-green-400", bg: "bg-green-400", border: "border-green-500/30", bgCard: "bg-green-500/10" };
    if (percent >= 1) return { text: "text-amber-400", bg: "bg-amber-400", border: "border-amber-500/30", bgCard: "bg-amber-500/10" };
    return { text: "text-gray-400", bg: "bg-gray-400", border: "border-white/10", bgCard: "bg-white/5" };
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Mic size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            PDF to Audio
          </span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          All tools
        </Link>

        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center">
              <Archive size={20} className="text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Compress PDF</h1>
          </div>
          <p className="text-gray-400">
            Reduce PDF file size by stripping metadata and rewriting the
            document structure. Everything runs in your browser — your files
            never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs flex items-center justify-center">
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
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
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
                <FileText size={24} className="text-cyan-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">
                  Drop your PDF here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse · max 100 MB
                </p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Compress */}
        {file && !result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs flex items-center justify-center">
                2
              </span>
              Compress
            </h2>

            {isCompressing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-cyan-400"
                  />
                  <span className="text-sm text-gray-300">
                    {progressLabel}
                  </span>
                  <span className="ml-auto text-sm text-gray-500">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #06b6d4, #22d3ee)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompress}
                disabled={isCompressing}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#06b6d4" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0891b2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#06b6d4")
                }
              >
                <Archive size={20} />
                Compress PDF
              </button>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-medium">Compression complete!</span>
            </div>

            {/* Size comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Original
                </p>
                <p className="text-xl font-bold text-white">
                  {formatSize(result.originalSize)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Compressed
                </p>
                <p className="text-xl font-bold text-cyan-400">
                  {formatSize(result.compressedSize)}
                </p>
              </div>
            </div>

            {/* Savings indicator */}
            {(() => {
              const colors = getSavingsColor(result.savingsPercent);
              const displayPercent = Math.max(0, result.savingsPercent);
              return (
                <div
                  className={`rounded-xl border p-4 flex items-center gap-3 ${colors.border} ${colors.bgCard}`}
                >
                  <TrendingDown size={20} className={colors.text} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${colors.text}`}>
                        {displayPercent > 0
                          ? `${displayPercent.toFixed(1)}% smaller`
                          : "No size reduction"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {result.originalSize > result.compressedSize
                          ? `Saved ${formatSize(result.originalSize - result.compressedSize)}`
                          : result.originalSize === result.compressedSize
                            ? "Same size"
                            : `Increased by ${formatSize(result.compressedSize - result.originalSize)}`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bg}`}
                        style={{
                          width: `${Math.min(100, Math.max(2, displayPercent))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#06b6d4" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#0891b2")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#06b6d4")
              }
            >
              <Download size={20} />
              Download Compressed PDF
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Compress another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
