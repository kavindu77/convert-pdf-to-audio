"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Droplets,
  Equal,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  GitCompare,
  Heading,
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Header */}
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
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/15 border border-[#14b8a6]/20 flex items-center justify-center">
              <GitCompare size={20} className="text-[#14b8a6]" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Compare PDFs</h1>
          </div>
          <p className="text-slate-500">
            Upload two PDF files to compare their text content. Differences are
            highlighted in a unified diff view. Everything runs in your browser
            — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload Two PDFs */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#14b8a6]/20 border border-[#14b8a6]/40 text-[#14b8a6] text-xs flex items-center justify-center">
              1
            </span>
            Upload PDFs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original PDF */}
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">
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
                      : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200"
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
                      <p className="font-medium text-slate-900 text-sm truncate max-w-[160px]">
                        {fileA.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatSize(fileA.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={28}
                      className="mx-auto mb-2 text-slate-400"
                    />
                    <p className="text-slate-600 font-medium text-sm">
                      Drop original PDF
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Modified PDF */}
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">
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
                      : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200"
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
                      <p className="font-medium text-slate-900 text-sm truncate max-w-[160px]">
                        {fileB.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatSize(fileB.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={28}
                      className="mx-auto mb-2 text-slate-400"
                    />
                    <p className="text-slate-600 font-medium text-sm">
                      Drop modified PDF
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
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
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Compare */}
        {fileA && fileB && !result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
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
                  <span className="text-sm text-slate-600">
                    {progressLabel}
                  </span>
                  <span className="ml-auto text-sm text-slate-400">
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
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#14b8a6]/20 border border-[#14b8a6]/40 text-[#14b8a6] text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">Comparison complete!</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Plus size={14} className="text-green-700" />
                  <p className="text-xs text-green-700 uppercase tracking-wider font-medium">
                    Added
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {result.added}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  line{result.added !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Minus size={14} className="text-red-800" />
                  <p className="text-xs text-red-800 uppercase tracking-wider font-medium">
                    Removed
                  </p>
                </div>
                <p className="text-2xl font-bold text-red-800">
                  {result.removed}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  line{result.removed !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Equal size={14} className="text-slate-500" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                    Unchanged
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-500">
                  {result.unchanged}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  line{result.unchanged !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Diff view */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 border-b border-slate-200">
                <GitCompare size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-medium">
                  Unified Diff View
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {result.lines.length} total line
                  {result.lines.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                <div className="font-mono text-sm min-w-[600px]">
                  {result.lines.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Both PDFs have no text content to compare.
                    </div>
                  ) : result.added === 0 && result.removed === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <CheckCircle2
                        size={32}
                        className="mx-auto mb-3 text-green-700"
                      />
                      <p className="font-medium text-slate-900 font-sans">
                        No differences found
                      </p>
                      <p className="text-sm text-slate-400 mt-1 font-sans">
                        The text content of both PDFs is identical.
                      </p>
                    </div>
                  ) : (
                    result.lines.map((line, index) => (
                      <div
                        key={index}
                        className={`flex items-stretch border-b border-slate-200/60 last:border-b-0 ${
                          line.type === "added"
                            ? "bg-green-50 border-l-2 border-l-green-500"
                            : line.type === "removed"
                            ? "bg-red-50 border-l-2 border-l-red-500"
                            : "border-l-2 border-l-transparent"
                        }`}
                      >
                        {/* Old line number */}
                        <span className="w-12 shrink-0 text-right pr-2 py-1 text-xs text-gray-600 select-none border-r border-slate-200/60">
                          {line.oldLineNum ?? ""}
                        </span>
                        {/* New line number */}
                        <span className="w-12 shrink-0 text-right pr-2 py-1 text-xs text-gray-600 select-none border-r border-slate-200/60">
                          {line.newLineNum ?? ""}
                        </span>
                        {/* Prefix */}
                        <span
                          className={`w-6 shrink-0 text-center py-1 select-none font-bold ${
                            line.type === "added"
                              ? "text-green-700"
                              : line.type === "removed"
                              ? "text-red-800"
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
                              ? "text-green-800"
                              : line.type === "removed"
                              ? "text-red-300"
                              : "text-slate-400"
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
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
            >
              Compare another pair of PDFs
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
