"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  EyeOff,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  Plus,
  X,
  Shield,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface RedactionPattern {
  id: string;
  label: string;
  regex: RegExp;
  enabled: boolean;
  matchCount: number;
  builtIn: boolean;
}

const BUILT_IN_PATTERNS: Omit<RedactionPattern, "enabled" | "matchCount">[] = [
  {
    id: "email",
    label: "Email Addresses",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    builtIn: true,
  },
  {
    id: "phone",
    label: "Phone Numbers",
    regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    builtIn: true,
  },
  {
    id: "ssn",
    label: "SSN",
    regex: /\d{3}[-]?\d{2}[-]?\d{4}/g,
    builtIn: true,
  },
  {
    id: "creditcard",
    label: "Credit Card Numbers",
    regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
    builtIn: true,
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text: string, regex: RegExp): number {
  const re = new RegExp(regex.source, regex.flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export default function RedactPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<RedactionPattern[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [redactedText, setRedactedText] = useState<string | null>(null);
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
    setExtractedText(null);
    setRedactedText(null);
    setPatterns([]);
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

  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setExtractedText(null);
    setRedactedText(null);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = content.items.map((item: any) => item.str).join(" ");
        pageTexts.push(text);
        setProgress({ current: pageNum, total: totalPages });
      }

      const fullText = pageTexts
        .map((text, i) => `--- Page ${i + 1} ---\n${text}`)
        .join("\n\n");

      setExtractedText(fullText);

      // Initialize patterns with match counts
      const initialPatterns: RedactionPattern[] = BUILT_IN_PATTERNS.map((p) => ({
        ...p,
        enabled: false,
        matchCount: countMatches(fullText, p.regex),
      }));
      setPatterns(initialPatterns);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Text extraction failed: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const togglePattern = (id: string) => {
    setPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    setRedactedText(null);
  };

  const addCustomPattern = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !extractedText) return;

    const id = `custom-${Date.now()}`;
    const regex = new RegExp(escapeRegex(trimmed), "gi");
    const matchCount = countMatches(extractedText, regex);

    setPatterns((prev) => [
      ...prev,
      {
        id,
        label: trimmed.length > 24 ? trimmed.slice(0, 24) + "…" : trimmed,
        regex,
        enabled: true,
        matchCount,
        builtIn: false,
      },
    ]);
    setCustomInput("");
    setRedactedText(null);
  };

  const removeCustomPattern = (id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    setRedactedText(null);
  };

  const enabledPatterns = patterns.filter((p) => p.enabled);
  const totalRedactions = enabledPatterns.reduce(
    (sum, p) => sum + p.matchCount,
    0
  );

  const applyRedaction = () => {
    if (!extractedText || enabledPatterns.length === 0) return;

    let result = extractedText;
    for (const pattern of enabledPatterns) {
      const re = new RegExp(pattern.regex.source, pattern.regex.flags);
      result = result.replace(re, "[REDACTED]");
    }
    setRedactedText(result);
  };

  const renderHighlightedText = (text: string) => {
    const parts = text.split("[REDACTED]");
    const elements: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      if (i > 0) {
        elements.push(
          <span
            key={`redacted-${i}`}
            className="bg-red-600/80 text-white px-1.5 py-0.5 rounded text-xs font-bold tracking-wide"
          >
            [REDACTED]
          </span>
        );
      }
      if (part) {
        elements.push(<span key={`text-${i}`}>{part}</span>);
      }
    });

    return elements;
  };

  const handleDownload = () => {
    if (!redactedText) return;
    const blob = new Blob([redactedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file?.name?.replace(/\.pdf$/i, "") || "redacted";
    a.download = `${baseName}-redacted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText(null);
    setRedactedText(null);
    setPatterns([]);
    setCustomInput("");
    setError(null);
    setIsExtracting(false);
    setProgress({ current: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

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
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/20 flex items-center justify-center">
              <EyeOff size={20} className="text-rose-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF Redactor</h1>
          </div>
          <p className="text-gray-400">
            Automatically detect and redact sensitive information from PDFs.
            Find emails, phone numbers, SSNs, credit cards, or custom text —
            everything runs in your browser.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
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
                  ? "border-rose-400 bg-rose-500/10"
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
                <FileText size={24} className="text-rose-400" />
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

        {/* Step 2: Extract Text */}
        {file && !extractedText && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
                2
              </span>
              Extract Text
            </h2>

            {isExtracting ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2
                      size={18}
                      className="animate-spin text-rose-400"
                    />
                    <span className="text-sm text-gray-300">
                      Extracting page {progress.current} of {progress.total}...
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercent}%`,
                      background: "linear-gradient(90deg, #f43f5e, #fb7185)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#f43f5e" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e11d48")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f43f5e")
                }
              >
                <FileText size={20} />
                Extract Text from PDF
              </button>
            )}
          </section>
        )}

        {/* Step 3: Configure Redaction */}
        {extractedText && !redactedText && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
                3
              </span>
              Configure Redaction
            </h2>

            {/* Text Preview */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Extracted Text Preview</p>
              <div className="max-h-56 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-4">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {extractedText.length > 3000
                    ? extractedText.slice(0, 3000) + "\n\n... (truncated for preview)"
                    : extractedText}
                </pre>
              </div>
            </div>

            {/* Pattern Detection */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-medium">
                Detect Sensitive Information
              </p>

              {/* Built-in pattern pills */}
              <div className="flex flex-wrap gap-2">
                {patterns
                  .filter((p) => p.builtIn)
                  .map((pattern) => (
                    <button
                      key={pattern.id}
                      type="button"
                      onClick={() => togglePattern(pattern.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        pattern.enabled
                          ? "bg-rose-500/20 border-rose-400/50 text-rose-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200"
                      }`}
                    >
                      <Shield size={14} />
                      {pattern.label}
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                          pattern.matchCount > 0
                            ? pattern.enabled
                              ? "bg-rose-500 text-white"
                              : "bg-white/10 text-gray-300"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {pattern.matchCount}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Custom patterns */}
              {patterns.filter((p) => !p.builtIn).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patterns
                    .filter((p) => !p.builtIn)
                    .map((pattern) => (
                      <button
                        key={pattern.id}
                        type="button"
                        onClick={() => togglePattern(pattern.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border group ${
                          pattern.enabled
                            ? "bg-rose-500/20 border-rose-400/50 text-rose-300"
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200"
                        }`}
                      >
                        &ldquo;{pattern.label}&rdquo;
                        <span
                          className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                            pattern.matchCount > 0
                              ? pattern.enabled
                                ? "bg-rose-500 text-white"
                                : "bg-white/10 text-gray-300"
                              : "bg-white/5 text-gray-500"
                          }`}
                        >
                          {pattern.matchCount}
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomPattern(pattern.id);
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        >
                          <X size={12} />
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {/* Custom text input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomPattern();
                  }}
                  placeholder="Add custom text to redact..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={addCustomPattern}
                  disabled={!customInput.trim()}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:border-rose-400/50 hover:text-rose-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Summary & Apply */}
            <div className="pt-2 space-y-3">
              {totalRedactions > 0 && (
                <div className="flex items-center gap-2 text-sm text-rose-300">
                  <EyeOff size={16} />
                  <span>
                    {totalRedactions} match{totalRedactions !== 1 ? "es" : ""}{" "}
                    will be redacted across{" "}
                    {enabledPatterns.length} pattern
                    {enabledPatterns.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={applyRedaction}
                disabled={enabledPatterns.length === 0}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    enabledPatterns.length > 0 ? "#f43f5e" : "#374151",
                }}
                onMouseEnter={(e) => {
                  if (enabledPatterns.length > 0)
                    e.currentTarget.style.backgroundColor = "#e11d48";
                }}
                onMouseLeave={(e) => {
                  if (enabledPatterns.length > 0)
                    e.currentTarget.style.backgroundColor = "#f43f5e";
                }}
              >
                <EyeOff size={20} />
                Apply Redaction
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Results */}
        {redactedText && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs flex items-center justify-center">
                <CheckCircle2 size={14} />
              </span>
              Redaction Complete
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-medium">
                Redaction applied successfully!
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Patterns Applied
                </p>
                <p className="text-xl font-bold text-rose-400">
                  {enabledPatterns.length}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Items Redacted
                </p>
                <p className="text-xl font-bold text-rose-400">
                  {totalRedactions}
                </p>
              </div>
            </div>

            {/* Redacted Preview */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Redacted Text Preview
              </p>
              <div className="max-h-80 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-4">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {renderHighlightedText(
                    redactedText.length > 5000
                      ? redactedText.slice(0, 5000) + "\n\n... (truncated for preview)"
                      : redactedText
                  )}
                </pre>
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#f43f5e" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#e11d48")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#f43f5e")
              }
            >
              <Download size={20} />
              Download Redacted Text (.txt)
            </button>

            {/* Back to configure */}
            <button
              type="button"
              onClick={() => setRedactedText(null)}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Adjust redaction patterns
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Redact another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
