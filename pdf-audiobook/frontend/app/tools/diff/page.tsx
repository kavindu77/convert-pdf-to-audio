"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  GitCompare,
  Upload,
  FileText,
  ArrowLeft,
  Loader2,
  Mic,
  CheckCircle2,
  Plus,
  Minus,
  Equal,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
}

function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const diffLines: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffLines.push({
        type: "unchanged",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffLines.push({
        type: "added",
        content: newLines[j - 1],
        oldLineNum: null,
        newLineNum: j,
      });
      j--;
    } else {
      diffLines.push({
        type: "removed",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: null,
      });
      i--;
    }
  }

  diffLines.reverse();

  const added = diffLines.filter((l) => l.type === "added").length;
  const removed = diffLines.filter((l) => l.type === "removed").length;
  const unchanged = diffLines.filter((l) => l.type === "unchanged").length;

  return { lines: diffLines, added, removed, unchanged };
}

export default function DiffPdfPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [isDragActiveA, setIsDragActiveA] = useState(false);
  const [isDragActiveB, setIsDragActiveB] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      return "Only PDF files are accepted.";
    }
    if (f.size > 100 * 1024 * 1024) {
      return "File too large (max 100 MB).";
    }
    return null;
  }, []);

  const handleFileA = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFileA(f);
      setError(null);
      setResult(null);
    },
    [validateFile]
  );

  const handleFileB = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFileB(f);
      setError(null);
      setResult(null);
    },
    [validateFile]
  );

  const onDropA = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActiveA(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileA(droppedFile);
    },
    [handleFileA]
  );

  const onDropB = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActiveB(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileB(droppedFile);
    },
    [handleFileB]
  );

  const onDragOverA = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActiveA(true);
  }, []);

  const onDragOverB = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActiveB(true);
  }, []);

  const onDragLeaveA = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActiveA(false);
  }, []);

  const onDragLeaveB = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActiveB(false);
  }, []);

  const onFileSelectA = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileA(selected);
    },
    [handleFileA]
  );

  const onFileSelectB = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileB(selected);
    },
    [handleFileB]
  );

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: unknown) => (item as { str: string }).str)
        .join(" ");
      textParts.push(pageText);
    }

    return textParts.join("\n");
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading original PDF...");

    try {
      // Step 1: Extract text from file A
      setProgress(10);
      const textA = await extractTextFromPdf(fileA);
      setProgress(40);
      setProgressLabel("Reading modified PDF...");

      // Step 2: Extract text from file B
      const textB = await extractTextFromPdf(fileB);
      setProgress(70);
      setProgressLabel("Computing differences...");

      // Step 3: Compute diff
      const diffResult = computeDiff(textA, textB);
      setProgress(100);
      setProgressLabel("Complete!");

      setResult(diffResult);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Comparison failed: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFileA(null);
    setFileB(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsProcessing(false);
    if (inputRefA.current) inputRefA.current.value = "";
    if (inputRefB.current) inputRefB.current.value = "";
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

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
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
            <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/15 border border-[#14b8a6]/20 flex items-center justify-center">
              <GitCompare size={20} className="text-[#14b8a6]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Compare PDFs</h1>
          </div>
          <p className="text-gray-400">
            Upload two PDF files to compare their text content. Differences are
            highlighted in a unified diff view. Everything runs in your browser
            — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload Two PDFs */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#14b8a6]/20 border border-[#14b8a6]/40 text-[#14b8a6] text-xs flex items-center justify-center">
              1
            </span>
            Upload PDFs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original PDF */}
            <div>
              <p className="text-sm text-gray-400 mb-2 font-medium">
                Original PDF
              </p>
              <div
                onDrop={onDropA}
                onDragOver={onDragOverA}
                onDragLeave={onDragLeaveA}
                onClick={() => inputRefA.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${
                    isDragActiveA
                      ? "border-[#14b8a6] bg-[#14b8a6]/10"
                      : "border-white/20 hover:border-white/40 hover:bg-white/5"
                  }`}
              >
                <input
                  ref={inputRefA}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onFileSelectA}
                  className="hidden"
                />
                {fileA ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={22} className="text-[#14b8a6]" />
                    <div className="text-left">
                      <p className="font-medium text-white text-sm truncate max-w-[160px]">
                        {fileA.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatSize(fileA.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={28}
                      className="mx-auto mb-2 text-gray-500"
                    />
                    <p className="text-gray-300 font-medium text-sm">
                      Drop original PDF
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Modified PDF */}
            <div>
              <p className="text-sm text-gray-400 mb-2 font-medium">
                Modified PDF
              </p>
              <div
                onDrop={onDropB}
                onDragOver={onDragOverB}
                onDragLeave={onDragLeaveB}
                onClick={() => inputRefB.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${
                    isDragActiveB
                      ? "border-[#14b8a6] bg-[#14b8a6]/10"
                      : "border-white/20 hover:border-white/40 hover:bg-white/5"
                  }`}
              >
                <input
                  ref={inputRefB}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onFileSelectB}
                  className="hidden"
                />
                {fileB ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={22} className="text-[#14b8a6]" />
                    <div className="text-left">
                      <p className="font-medium text-white text-sm truncate max-w-[160px]">
                        {fileB.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatSize(fileB.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={28}
                      className="mx-auto mb-2 text-gray-500"
                    />
                    <p className="text-gray-300 font-medium text-sm">
                      Drop modified PDF
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Compare */}
        {fileA && fileB && !result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#14b8a6]/20 border border-[#14b8a6]/40 text-[#14b8a6] text-xs flex items-center justify-center">
                2
              </span>
              Compare
            </h2>

            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-[#14b8a6]"
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
                        "linear-gradient(90deg, #14b8a6, #2dd4bf)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompare}
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#14b8a6" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0d9488")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#14b8a6")
                }
              >
                <GitCompare size={20} />
                Compare PDFs
              </button>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#14b8a6]/20 border border-[#14b8a6]/40 text-[#14b8a6] text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-medium">Comparison complete!</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Plus size={14} className="text-green-400" />
                  <p className="text-xs text-green-400 uppercase tracking-wider font-medium">
                    Added
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {result.added}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  line{result.added !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Minus size={14} className="text-red-400" />
                  <p className="text-xs text-red-400 uppercase tracking-wider font-medium">
                    Removed
                  </p>
                </div>
                <p className="text-2xl font-bold text-red-400">
                  {result.removed}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  line{result.removed !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Equal size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                    Unchanged
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-400">
                  {result.unchanged}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  line{result.unchanged !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Diff view */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border-b border-white/10">
                <GitCompare size={14} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">
                  Unified Diff View
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {result.lines.length} total line
                  {result.lines.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                <div className="font-mono text-sm min-w-[600px]">
                  {result.lines.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Both PDFs have no text content to compare.
                    </div>
                  ) : result.added === 0 && result.removed === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <CheckCircle2
                        size={32}
                        className="mx-auto mb-3 text-green-400"
                      />
                      <p className="font-medium text-white font-sans">
                        No differences found
                      </p>
                      <p className="text-sm text-gray-500 mt-1 font-sans">
                        The text content of both PDFs is identical.
                      </p>
                    </div>
                  ) : (
                    result.lines.map((line, index) => (
                      <div
                        key={index}
                        className={`flex items-stretch border-b border-white/5 last:border-b-0 ${
                          line.type === "added"
                            ? "bg-green-500/10 border-l-2 border-l-green-500"
                            : line.type === "removed"
                            ? "bg-red-500/10 border-l-2 border-l-red-500"
                            : "border-l-2 border-l-transparent"
                        }`}
                      >
                        {/* Old line number */}
                        <span className="w-12 shrink-0 text-right pr-2 py-1 text-xs text-gray-600 select-none border-r border-white/5">
                          {line.oldLineNum ?? ""}
                        </span>
                        {/* New line number */}
                        <span className="w-12 shrink-0 text-right pr-2 py-1 text-xs text-gray-600 select-none border-r border-white/5">
                          {line.newLineNum ?? ""}
                        </span>
                        {/* Prefix */}
                        <span
                          className={`w-6 shrink-0 text-center py-1 select-none font-bold ${
                            line.type === "added"
                              ? "text-green-400"
                              : line.type === "removed"
                              ? "text-red-400"
                              : "text-gray-600"
                          }`}
                        >
                          {line.type === "added"
                            ? "+"
                            : line.type === "removed"
                            ? "−"
                            : " "}
                        </span>
                        {/* Content */}
                        <span
                          className={`flex-1 py-1 pr-4 whitespace-pre-wrap break-all ${
                            line.type === "added"
                              ? "text-green-300"
                              : line.type === "removed"
                              ? "text-red-300"
                              : "text-gray-500"
                          }`}
                        >
                          {line.content || "\u00A0"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Compare another pair of PDFs
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
