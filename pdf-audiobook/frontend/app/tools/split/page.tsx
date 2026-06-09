"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Scissors,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
} from "lucide-react";

type SplitMode = "every-page" | "custom-ranges";

interface SplitResult {
  fileName: string;
  pageLabel: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseRanges(input: string, totalPages: number): number[][] {
  const groups: number[][] = [];
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < 1 || end < start || end > totalPages) {
        throw new Error(`Invalid range "${part}". Pages must be between 1 and ${totalPages}.`);
      }
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i);
      groups.push(pages);
    } else if (/^\d+$/.test(part)) {
      const page = parseInt(part, 10);
      if (page < 1 || page > totalPages) {
        throw new Error(`Page ${page} is out of range. PDF has ${totalPages} pages.`);
      }
      groups.push([page]);
    } else {
      throw new Error(`Cannot parse "${part}". Use formats like "1-3, 5, 7-10".`);
    }
  }

  if (groups.length === 0) {
    throw new Error("Please enter at least one page or range.");
  }

  return groups;
}

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const [splitMode, setSplitMode] = useState<SplitMode>("every-page");
  const [rangeInput, setRangeInput] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────
  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100 MB.");
      return;
    }

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();

      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(count);
    } catch {
      setError("Failed to read PDF. The file may be corrupted or password-protected.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) loadFile(droppedFile);
    },
    [loadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) loadFile(selected);
    },
    [loadFile]
  );

  // ── Split logic ────────────────────────────────────────────────
  const handleSplit = async () => {
    if (!pdfBytes || totalPages === 0) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;

      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      let pageGroups: number[][];
      if (splitMode === "every-page") {
        pageGroups = Array.from({ length: totalPages }, (_, i) => [i + 1]);
      } else {
        pageGroups = parseRanges(rangeInput, totalPages);
      }

      const zip = new JSZip();
      const splitResults: SplitResult[] = [];
      let totalBytes = 0;

      for (let i = 0; i < pageGroups.length; i++) {
        const group = pageGroups[i];
        const newPdf = await PDFDocument.create();
        const indices = group.map((p) => p - 1); // 0-indexed
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const pdfData = await newPdf.save();
        const pageLabel =
          group.length === 1
            ? `page-${group[0]}`
            : `pages-${group[0]}-${group[group.length - 1]}`;
        const fileName = `${(file?.name || "document").replace(/\.pdf$/i, "")}_${pageLabel}.pdf`;

        zip.file(fileName, pdfData);
        splitResults.push({
          fileName,
          pageLabel: group.length === 1 ? `Page ${group[0]}` : `Pages ${group[0]}–${group[group.length - 1]}`,
          size: pdfData.length,
        });
        totalBytes += pdfData.length;

        setProgress(Math.round(((i + 1) / pageGroups.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      setZipBlob(blob);
      setResults(splitResults);
      setTotalSize(totalBytes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred while splitting the PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(file?.name || "document").replace(/\.pdf$/i, "")}_split.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setTotalPages(0);
    setSplitMode("every-page");
    setRangeInput("");
    setResults(null);
    setZipBlob(null);
    setProgress(0);
    setError(null);
    setTotalSize(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────
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
          <span className="font-semibold text-lg tracking-tight">DocuSafe PDF</span>
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
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center">
              <Scissors size={20} className="text-pink-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Split PDF</h1>
          </div>
          <p className="text-gray-400">
            Split a PDF into individual pages or custom page ranges. Everything runs
            locally in your browser — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragActive
                ? "border-pink-400 bg-pink-500/10"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-pink-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(file.size)} · {totalPages} page
                    {totalPages !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">Drop your PDF here</p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse · max 100 MB
                </p>
              </>
            )}
          </div>
        </section>

        {/* Step 2: Configure split mode */}
        {file && totalPages > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs flex items-center justify-center">
                2
              </span>
              Choose Split Mode
            </h2>

            {/* Mode toggle */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSplitMode("every-page")}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all
                  ${splitMode === "every-page"
                    ? "bg-pink-500 border-pink-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                  }`}
              >
                Split Every Page
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("custom-ranges")}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all
                  ${splitMode === "custom-ranges"
                    ? "bg-pink-500 border-pink-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                  }`}
              >
                Custom Ranges
              </button>
            </div>

            {splitMode === "every-page" ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <FileText size={18} className="text-pink-400 shrink-0" />
                <p className="text-sm text-gray-300">
                  This will create <span className="text-white font-semibold">{totalPages}</span>{" "}
                  separate PDF{totalPages !== 1 ? "s" : ""}, one for each page.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-10"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/30 transition-all"
                />
                <p className="text-xs text-gray-500">
                  Enter page numbers and ranges separated by commas. Each range creates a separate
                  PDF. Total pages: <span className="text-gray-300">{totalPages}</span>
                </p>
              </div>
            )}
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Scissors size={18} className="shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Split button */}
        {file && !results && (
          <button
            type="button"
            disabled={
              isProcessing ||
              !pdfBytes ||
              (splitMode === "custom-ranges" && rangeInput.trim() === "")
            }
            onClick={handleSplit}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isProcessing ? "#be185d" : "#ec4899",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = "#f472b6";
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = "#ec4899";
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Splitting...
              </>
            ) : (
              <>
                <Scissors size={20} /> Split PDF
              </>
            )}
          </button>
        )}

        {/* Processing progress */}
        {isProcessing && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-pink-400" />
                <span className="font-medium">Splitting PDF...</span>
              </div>
              <span className="text-sm text-gray-400">{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "#ec4899",
                }}
              />
            </div>
          </section>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-400" />
                <span className="font-medium">Split Complete</span>
              </div>
              <span className="text-sm text-gray-400">
                {results.length} file{results.length !== 1 ? "s" : ""} · {formatFileSize(totalSize)}
              </span>
            </div>

            {/* File list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {results.map((r) => (
                <div
                  key={r.fileName}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-pink-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{r.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {r.pageLabel} · {formatFileSize(r.size)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Download ZIP */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#ec4899" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f472b6")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ec4899")}
            >
              <Download size={20} />
              Download ZIP ({zipBlob ? formatFileSize(zipBlob.size) : ""})
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Split another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
