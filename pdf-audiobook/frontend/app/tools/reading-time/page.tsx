"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  BookOpen,
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
  Image,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Merge,
  MessageSquare,
  Mic,
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
  TrendingUp,
  Upload,
  User,
  Volume2,
  X,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface PageStat {
  pageNumber: number;
  wordCount: number;
}

interface StatsReport {
  totalWords: number;
  totalChars: number;
  totalPages: number;
  avgWordsPerPage: number;
  avgWordLength: number;
  readingTimes: {
    slow: number; // 200 wpm
    average: number; // 250 wpm
    fast: number; // 300 wpm
  };
  speakingTime: number; // 130 wpm
  readabilityGrade: number; // Automated Readability Index
  pageBreakdown: PageStat[];
}

export default function ReadingTimePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [stats, setStats] = useState<StatsReport | null>(null);
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
    setStats(null);
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

  const handleAnalyze = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Loading PDF engine...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      setProgress(30);
      setProgressLabel("Reading layout...");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let totalWords = 0;
      let totalChars = 0;
      let totalSentences = 0;
      const pageBreakdown: PageStat[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");

        const cleanText = pageText.trim();
        const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
        const sentences = cleanText ? cleanText.split(/[.!?]+/).filter(Boolean) : [];

        totalWords += words.length;
        totalChars += pageText.replace(/\s+/g, "").length;
        totalSentences += sentences.length;

        pageBreakdown.push({
          pageNumber: i,
          wordCount: words.length,
        });

        setProgress(Math.round(30 + (i / totalPages) * 70));
        setProgressLabel(`Analyzing page ${i} of ${totalPages}...`);
      }

      if (totalWords === 0) {
        throw new Error("No readable text found in this document.");
      }

      const avgWordsPerPage = Math.round(totalWords / totalPages);
      const avgWordLength = totalChars / totalWords;

      // Estimate Reading Times (minutes)
      const readingTimes = {
        slow: totalWords / 200,
        average: totalWords / 250,
        fast: totalWords / 300,
      };

      // Estimate Speaking Time (minutes)
      const speakingTime = totalWords / 130;

      // Simple Automated Readability Index (ARI) approximation:
      // 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
      const sentencesCount = Math.max(1, totalSentences);
      const ari = 4.71 * (totalChars / totalWords) + 0.5 * (totalWords / sentencesCount) - 21.43;
      const readabilityGrade = Math.max(1, Math.min(18, Math.round(ari)));

      setStats({
        totalWords,
        totalChars,
        totalPages,
        avgWordsPerPage,
        avgWordLength,
        readingTimes,
        speakingTime,
        readabilityGrade,
        pageBreakdown,
      });

      setProgress(100);
      setProgressLabel("Analysis complete!");
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const formatMinutes = (minutes: number): string => {
    const mins = Math.ceil(minutes);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  const getGradeLevelLabel = (grade: number): string => {
    if (grade <= 5) return `Primary School (Grade ${grade})`;
    if (grade <= 8) return `Middle School (Grade ${grade})`;
    if (grade <= 12) return `High School (Grade ${grade})`;
    if (grade <= 16) return `College level (Grade ${grade})`;
    return "Graduate level / Academic";
  };

  const handleDownloadReport = () => {
    if (!stats || !file) return;

    const report = `READING TIME ESTIMATE REPORT
------------------------------
Document: ${file.name}
Pages: ${stats.totalPages}
Total Words: ${stats.totalWords}
Total Characters: ${stats.totalChars}
Average Words/Page: ${stats.avgWordsPerPage}

READING TIME ESTIMATES
- Slow (200 WPM): ${formatMinutes(stats.readingTimes.slow)}
- Average (250 WPM): ${formatMinutes(stats.readingTimes.average)}
- Fast (300 WPM): ${formatMinutes(stats.readingTimes.fast)}

SPEAKING / AUDIOBOOK ESTIMATE
- Audiobook Speed (130 WPM): ${formatMinutes(stats.speakingTime)}

READABILITY
- Estimated Readability Grade: ${stats.readabilityGrade} (${getGradeLevelLabel(stats.readabilityGrade)})

------------------------------
Generated by DocuSafe PDF.
`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const baseName = file.name.replace(/\.pdf$/i, "");
    const a = document.createElement('a');
    a.download = `${baseName}-reading-report.txt`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setStats(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // Find max words per page for the graph scaling
  const maxWordsPerPage = stats ? Math.max(...stats.pageBreakdown.map((p) => p.wordCount), 1) : 1;

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

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Reading Time Estimator</h1>
          </div>
          <p className="text-slate-500">
            Analyze any PDF to calculate reading time speeds, total word counts, audio speaking duration, and vocabulary readability.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              file ? "border-amber-500/30 bg-amber-500/5 animate-none" : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200 cursor-pointer"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-amber-400" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-medium">Drop your PDF here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse · max 100 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Step 2: Processing button */}
        {file && !stats && (
          <button
            onClick={handleAnalyze}
            disabled={isExtracting}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "#f59e0b" }}
          >
            {isExtracting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {progressLabel} ({progress}%)
              </>
            ) : (
              <>
                <Clock size={20} />
                Analyze Reading Stats
              </>
            )}
          </button>
        )}

        {/* Step 3: Analysis Results */}
        {stats && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-slate-600 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center">
                    2
                  </span>
                  Document Analysis Summary
                </h2>
                <button
                  onClick={handleDownloadReport}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Report
                </button>
              </div>

              {/* Big stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Words</span>
                  <span className="text-2xl font-bold text-slate-900">{stats.totalWords.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Characters</span>
                  <span className="text-2xl font-bold text-slate-900">{stats.totalChars.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Pages</span>
                  <span className="text-2xl font-bold text-slate-900">{stats.totalPages}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Words / Page</span>
                  <span className="text-2xl font-bold text-slate-900">{stats.avgWordsPerPage}</span>
                </div>
              </div>

              {/* Reading time breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Reading speed box */}
                <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400" />
                    Estimated Silent Reading Time
                  </h3>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <div className="text-xs">
                        <span className="font-medium text-slate-600">Fast Speed</span>
                        <span className="text-slate-400 block">300 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{formatMinutes(stats.readingTimes.fast)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                      <div className="text-xs">
                        <span className="font-medium text-slate-600 font-semibold text-slate-900">Average Speed</span>
                        <span className="text-slate-400 block">250 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{formatMinutes(stats.readingTimes.average)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                      <div className="text-xs">
                        <span className="font-medium text-slate-600">Relaxed Speed</span>
                        <span className="text-slate-400 block">200 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-amber-500">{formatMinutes(stats.readingTimes.slow)}</span>
                    </div>
                  </div>
                </div>

                {/* Speech and readability */}
                <div className="space-y-4">
                  
                  {/* Speaking Time */}
                  <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                      <Volume2 size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Speaking / Audiobook Duration</span>
                      <span className="text-lg font-bold text-slate-900">{formatMinutes(stats.speakingTime)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Estimated at 130 WPM</span>
                    </div>
                  </div>

                  {/* Readability */}
                  <div className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <TrendingUp size={20} className="text-pink-600" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Readability Grade</span>
                      <span className="text-lg font-bold text-slate-900">{getGradeLevelLabel(stats.readabilityGrade)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">ARI Complexity: Index {stats.readabilityGrade}</span>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* Per page word counts list */}
            {stats.totalPages > 1 && (
              <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-semibold text-slate-600 text-sm">Words per Page Breakdown</h3>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {stats.pageBreakdown.map((page) => {
                    const percentage = Math.round((page.wordCount / maxWordsPerPage) * 100);
                    return (
                      <div key={page.pageNumber} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-14 text-right shrink-0">Page {page.pageNumber}</span>
                        <div className="flex-1 h-3 bg-slate-50 border border-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all duration-1000 bg-amber-500/30 border-r border-amber-400/50"
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 w-16 shrink-0">{page.wordCount.toLocaleString()} w</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 transition-all text-xs"
            >
              Analyze another PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
