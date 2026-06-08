"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileText, Upload, ArrowLeft, Download, Loader2,
  Mic, CheckCircle2, Copy, ClipboardCheck,
} from "lucide-react";

interface ExtractionStats {
  totalPages: number;
  wordCount: number;
  charCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ExtractTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [stats, setStats] = useState<ExtractionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("File too large (max 100 MB).");
      return;
    }
    setFile(f);
    setError(null);
    setExtractedText(null);
    setStats(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }, [handleFile]);

  const extractText = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setExtractedText(null);
    setStats(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(" ");
        pageTexts.push(text);
        setProgress({ current: pageNum, total: totalPages });
      }

      const fullText = pageTexts
        .map((text, i) => `--- Page ${i + 1} ---\n${text}`)
        .join("\n\n");

      const wordCount = fullText
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      const charCount = fullText.length;

      setExtractedText(fullText);
      setStats({ totalPages, wordCount, charCount });
    } catch (err: any) {
      console.error("Text extraction failed:", err);
      setError(err?.message || "Failed to extract text. The PDF may be corrupted or password-protected.");
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  const downloadAsTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file?.name?.replace(/\.pdf$/i, "") || "extracted";
    a.download = `${baseName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setExtractedText(null);
    setStats(null);
    setError(null);
    setIsExtracting(false);
    setProgress({ current: 0, total: 0 });
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Mic size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Extract Text from PDF</h1>
          <p className="text-gray-400">
            Extract all text content from any PDF file. Everything runs locally in your browser — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragOver
                ? "border-orange-400 bg-orange-500/10"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-orange-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">Drop your PDF here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse · max 100 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <FileText size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Extract */}
        {file && !extractedText && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs flex items-center justify-center">
                2
              </span>
              Extract Text
            </h2>

            {isExtracting ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-orange-400" />
                    <span className="text-sm text-gray-300">
                      Extracting page {progress.current} of {progress.total}...
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={extractText}
                className="w-full py-4 rounded-2xl font-semibold text-lg bg-orange-600 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
              >
                <FileText size={20} />
                Extract Text
              </button>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {extractedText && stats && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs flex items-center justify-center">
                <CheckCircle2 size={14} />
              </span>
              Extraction Complete
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.totalPages}</p>
                <p className="text-xs text-gray-400 mt-1">Pages</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.wordCount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Words</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.charCount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Characters</p>
              </div>
            </div>

            {/* Text Preview */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Preview</p>
              <div className="max-h-96 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-4">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {extractedText}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={copyToClipboard}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                  ${copied
                    ? "bg-green-600 text-white"
                    : "border border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                  }`}
              >
                {copied ? (
                  <>
                    <ClipboardCheck size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={downloadAsTxt}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download as .txt
              </button>
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={reset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Extract from another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
