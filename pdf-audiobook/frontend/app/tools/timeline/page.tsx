"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Heading,
  History,
  Image,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Merge,
  MessageSquare,
  Mic,
  Minus,
  Palette,
  Paperclip,
  Plus,
  RotateCw,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  X,
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

            <header className="sticky top-0 relative border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-750 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={16} className="text-slate-900" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/tools/merge" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Compress PDF</Link>
            
            {/* Mega menu link dropdown style */}
            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                Convert PDF <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 flex flex-col gap-1 text-left">
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mb-1">Convert to PDF</div>
                <Link href="/tools/images-to-pdf" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileImage size={13} className="text-green-500 shrink-0" /> Images to PDF</Link>
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mt-2 mb-1">Convert from PDF</div>
                <Link href="/tools/pdf-to-images" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Image size={13} className="text-amber-500 shrink-0" /> PDF to Images</Link>
                <Link href="/tools/extract-text" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileText size={13} className="text-orange-500 shrink-0" /> Extract Text</Link>
                <Link href="/tools/pdf-to-audio" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Mic size={13} className="text-indigo-500 shrink-0" /> PDF to Audio</Link>
              </div>
            </div>

            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                All PDF Tools <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-[240px] mt-1 w-[720px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 grid grid-cols-4 gap-4 text-left">
                {/* Organize */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Organize PDF</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/merge" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Merge size={12} className="text-[#8b5cf6]" /> Merge PDF</Link>
                    <Link href="/tools/split" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Scissors size={12} className="text-[#ec4899]" /> Split PDF</Link>
                    <Link href="/tools/compress" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Archive size={12} className="text-[#06b6d4]" /> Compress PDF</Link>
                    <Link href="/tools/rotate" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><RotateCw size={12} className="text-[#a855f7]" /> Rotate PDF</Link>
                  </div>
                </div>
                {/* Security */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Security &amp; Privacy</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/privacy-report" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Eye size={12} className="text-[#14b8a6]" /> Privacy Report</Link>
                    <Link href="/tools/evidence-locker" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#3b82f6]" /> Evidence Locker</Link>
                    <Link href="/tools/fake-redaction" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><AlertOctagon size={12} className="text-[#ef4444]" /> Fake Redaction</Link>
                    <Link href="/tools/attachments" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Paperclip size={12} className="text-[#6366f1]" /> Attachments</Link>
                    <Link href="/tools/password-protect" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Lock size={12} className="text-[#ef4444]" /> Protect PDF</Link>
                  </div>
                </div>
                {/* Print */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Print &amp; Scan</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/color-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Palette size={12} className="text-[#10b981]" /> Color Detector</Link>
                    <Link href="/tools/ink-saver" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sun size={12} className="text-[#eab308]" /> Ink Saver</Link>
                    <Link href="/tools/bad-scan-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ScanLine size={12} className="text-[#ec4899]" /> Bad Scan</Link>
                    <Link href="/tools/watermark" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Droplets size={12} className="text-[#0ea5e9]" /> Watermark</Link>
                  </div>
                </div>
                {/* AI */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">AI &amp; Business</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/pdf-chat" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><MessageSquare size={12} className="text-[#818cf8]" /> PDF Q&amp;A Chat</Link>
                    <Link href="/tools/summarize" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sparkles size={12} className="text-[#d946ef]" /> Summarizer</Link>
                    <Link href="/tools/flashcards" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Layers size={12} className="text-[#10b981]" /> Flashcards</Link>
                    <Link href="/tools/pdf-to-audio" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Mic size={12} className="text-[#6366f1]" /> PDF to Audio</Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-slate-700 font-bold">{userName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <History size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Version Diff Timeline</h1>
          </div>
          <p className="text-slate-500">
            Upload multiple historical versions of a PDF (e.g. contracts, revisions) to visualize a step-by-step change timeline.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-6 bg-white shadow-sm border border-slate-200/80 backdrop-blur-md">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center">1</span>
            Upload PDF Versions
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-purple-500/50 hover:bg-purple-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <Upload className="mx-auto text-slate-400 mb-4 animate-pulse" size={36} />
            <p className="text-sm text-slate-900 font-medium">Click or drag PDF to add version</p>
            <p className="text-xs text-slate-400 mt-1">Upload up to 5 versions (max 50 MB per file)</p>
          </div>

          {versions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline Order (Earliest to Latest)</p>
              <div className="space-y-2">
                {versions.map((ver, idx) => (
                  <div key={ver.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold">
                        V{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-xs sm:max-w-md">{ver.name}</p>
                        <p className="text-[10px] text-slate-400">{formatSize(ver.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveVersion(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveVersion(idx, "down")}
                        disabled={idx === versions.length - 1}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => removeVersion(ver.id)}
                        className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 hover:bg-red-500/20 hover:text-red-300 transition-all ml-1"
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
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-slate-900 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  >
                    Compare PDF Timeline
                  </button>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
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
            <p className="text-red-800 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Comparison Timeline Results */}
        {comparisons.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-lg">Timeline Revisions</h2>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
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

                  <div className="p-5 bg-white shadow-sm border border-slate-200/80 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Revision Step {idx + 1}</span>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {comp.fromName} → {comp.toName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                          <Plus size={10} /> {comp.addedCount} additions
                        </span>
                        <span className="flex items-center gap-1 text-red-800 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-medium">
                          <Minus size={10} /> {comp.removedCount} deletions
                        </span>
                      </div>
                    </div>

                    {/* Diff content brief / preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">Key differences in this version:</p>
                      
                      <div className="space-y-1 text-xs max-h-48 overflow-y-auto bg-gray-900/60 p-3 rounded-lg border border-slate-200/60 font-mono">
                        {comp.changes
                          .filter(c => c.type !== "unchanged")
                          .slice(0, 10)
                          .map((c, i) => (
                            <div
                              key={i}
                              className={`p-1 rounded ${
                                c.type === "added"
                                  ? "bg-green-50 text-green-800 border-l-2 border-green-500 pl-2"
                                  : "bg-red-50 text-red-300 border-l-2 border-red-500 pl-2"
                              }`}
                            >
                              <span className="opacity-50 mr-1.5">{c.type === "added" ? "+" : "-"}</span>
                              {c.content}
                            </div>
                          ))}
                        {comp.changes.filter(c => c.type !== "unchanged").length > 10 && (
                          <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                            ... and {comp.changes.filter(c => c.type !== "unchanged").length - 10} more line changes.
                          </p>
                        )}
                        {comp.changes.filter(c => c.type !== "unchanged").length === 0 && (
                          <p className="text-[10px] text-slate-400 italic text-center">
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
