"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  History,
  Upload,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Clock,
  Plus,
  Minus,
} from "lucide-react";

interface PDFVersion {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface DiffChange {
  type: "added" | "removed" | "unchanged";
  content: string;
}

interface VersionComparison {
  fromName: string;
  toName: string;
  addedCount: number;
  removedCount: number;
  changes: DiffChange[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split("\n").map(l => l.trim()).filter(Boolean);
  const newLines = newText.split("\n").map(l => l.trim()).filter(Boolean);
  
  const m = oldLines.length;
  const n = newLines.length;
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const changes: DiffChange[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      changes.push({ type: "unchanged", content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      changes.push({ type: "added", content: newLines[j - 1] });
      j--;
    } else {
      changes.push({ type: "removed", content: oldLines[i - 1] });
      i--;
    }
  }
  changes.reverse();

  const addedCount = changes.filter(c => c.type === "added").length;
  const removedCount = changes.filter(c => c.type === "removed").length;

  return { changes, addedCount, removedCount };
}

export default function VersionTimeline() {
  const [versions, setVersions] = useState<PDFVersion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<VersionComparison[]>([]);
  const [showFullDiff, setShowFullDiff] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large (max 50 MB).");
      return;
    }

    setVersions(prev => {
      if (prev.length >= 5) {
        setError("Maximum of 5 versions allowed.");
        return prev;
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: f.size,
        },
      ];
    });
    setError(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const removeVersion = (id: string) => {
    setVersions(prev => prev.filter(v => v.id !== id));
    setComparisons([]);
  };

  const moveVersion = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= versions.length) return;
    
    setVersions(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIdx];
      copy[newIdx] = temp;
      return copy;
    });
    setComparisons([]);
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      textParts.push(pageText);
    }
    return textParts.join("\n");
  };

  const runComparison = async () => {
    if (versions.length < 2) {
      setError("Please upload at least 2 versions to compare.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setComparisons([]);

    try {
      const texts: string[] = [];
      for (let k = 0; k < versions.length; k++) {
        setProgressLabel(`Extracting text from Version ${k + 1}...`);
        setProgress(Math.round((k / versions.length) * 50));
        const txt = await extractTextFromPdf(versions[k].file);
        texts.push(txt);
      }

      const results: VersionComparison[] = [];
      for (let k = 1; k < versions.length; k++) {
        setProgressLabel(`Comparing Version ${k} with Version ${k + 1}...`);
        setProgress(50 + Math.round((k / (versions.length - 1)) * 40));
        const diff = computeDiff(texts[k - 1], texts[k]);
        results.push({
          fromName: versions[k - 1].name,
          toName: versions[k].name,
          addedCount: diff.addedCount,
          removedCount: diff.removedCount,
          changes: diff.changes,
        });
      }

      setProgress(100);
      setProgressLabel("Completed!");
      setComparisons(results);
    } catch (err: any) {
      setError(`Failed to extract text: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = () => {
    let report = `PDF Version Diff Timeline Report\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `========================================\n\n`;
    
    comparisons.forEach((comp, idx) => {
      report += `Timeline Step ${idx + 1}: ${comp.fromName} -> ${comp.toName}\n`;
      report += `Summary: +${comp.addedCount} lines added, -${comp.removedCount} lines removed\n`;
      report += `----------------------------------------\n`;
      comp.changes.forEach(c => {
        if (c.type === "added") report += `+ ${c.content}\n`;
        else if (c.type === "removed") report += `- ${c.content}\n`;
      });
      report += `========================================\n\n`;
    });

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pdf_version_timeline_report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <History size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <History size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Version Diff Timeline</h1>
          </div>
          <p className="text-gray-400">
            Upload multiple historical versions of a PDF (e.g. contracts, revisions) to visualize a step-by-step change timeline.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center">1</span>
            Upload PDF Versions
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <Upload className="mx-auto text-gray-500 mb-4 animate-pulse" size={36} />
            <p className="text-sm text-white font-medium">Click or drag PDF to add version</p>
            <p className="text-xs text-gray-500 mt-1">Upload up to 5 versions (max 50 MB per file)</p>
          </div>

          {versions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline Order (Earliest to Latest)</p>
              <div className="space-y-2">
                {versions.map((ver, idx) => (
                  <div key={ver.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold">
                        V{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">{ver.name}</p>
                        <p className="text-[10px] text-gray-500">{formatSize(ver.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveVersion(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveVersion(idx, "down")}
                        disabled={idx === versions.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => removeVersion(ver.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {versions.length >= 2 && !isProcessing && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={runComparison}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  >
                    Compare PDF Timeline
                  </button>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                  {progressLabel}
                </span>
                <span className="text-purple-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Comparison Timeline Results */}
        {comparisons.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">Timeline Revisions</h2>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition-all"
              >
                <FileText size={14} />
                Download Report
              </button>
            </div>

            <div className="relative pl-6 border-l border-white/15 space-y-8">
              {comparisons.map((comp, idx) => (
                <div key={idx} className="relative space-y-4">
                  {/* Timeline point */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-purple-500 border-4 border-gray-950 shadow-md flex items-center justify-center" />

                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div>
                        <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Revision Step {idx + 1}</span>
                        <h3 className="font-bold text-white text-sm">
                          {comp.fromName} → {comp.toName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 font-medium">
                          <Plus size={10} /> {comp.addedCount} additions
                        </span>
                        <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-medium">
                          <Minus size={10} /> {comp.removedCount} deletions
                        </span>
                      </div>
                    </div>

                    {/* Diff content brief / preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Key differences in this version:</p>
                      
                      <div className="space-y-1 text-xs max-h-48 overflow-y-auto bg-gray-900/60 p-3 rounded-lg border border-white/5 font-mono">
                        {comp.changes
                          .filter(c => c.type !== "unchanged")
                          .slice(0, 10)
                          .map((c, i) => (
                            <div
                              key={i}
                              className={`p-1 rounded ${
                                c.type === "added"
                                  ? "bg-green-500/10 text-green-300 border-l-2 border-green-500 pl-2"
                                  : "bg-red-500/10 text-red-300 border-l-2 border-red-500 pl-2"
                              }`}
                            >
                              <span className="opacity-50 mr-1.5">{c.type === "added" ? "+" : "-"}</span>
                              {c.content}
                            </div>
                          ))}
                        {comp.changes.filter(c => c.type !== "unchanged").length > 10 && (
                          <p className="text-[10px] text-gray-500 italic pt-1 text-center">
                            ... and {comp.changes.filter(c => c.type !== "unchanged").length - 10} more line changes.
                          </p>
                        )}
                        {comp.changes.filter(c => c.type !== "unchanged").length === 0 && (
                          <p className="text-[10px] text-gray-500 italic text-center">
                            No text differences found. File structure or metadata may have been updated.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
