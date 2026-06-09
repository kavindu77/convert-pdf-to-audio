"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  BookOpen,
  Volume2,
  TrendingUp,
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
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
Generated by PDF to Audio Toolkit.
`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}-reading-report.txt`;
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Reading Time Estimator</h1>
          </div>
          <p className="text-gray-400">
            Analyze any PDF to calculate reading time speeds, total word counts, audio speaking duration, and vocabulary readability.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
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
              file ? "border-amber-500/30 bg-amber-500/5 animate-none" : "border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer"
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
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Change file
                </button>
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
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
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
            <section className="rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-300 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center">
                    2
                  </span>
                  Document Analysis Summary
                </h2>
                <button
                  onClick={handleDownloadReport}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Report
                </button>
              </div>

              {/* Big stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Words</span>
                  <span className="text-2xl font-bold text-white">{stats.totalWords.toLocaleString()}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Characters</span>
                  <span className="text-2xl font-bold text-white">{stats.totalChars.toLocaleString()}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Pages</span>
                  <span className="text-2xl font-bold text-white">{stats.totalPages}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Words / Page</span>
                  <span className="text-2xl font-bold text-white">{stats.avgWordsPerPage}</span>
                </div>
              </div>

              {/* Reading time breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Reading speed box */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400" />
                    Estimated Silent Reading Time
                  </h3>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <div className="text-xs">
                        <span className="font-medium text-gray-300">Fast Speed</span>
                        <span className="text-gray-500 block">300 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{formatMinutes(stats.readingTimes.fast)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <div className="text-xs">
                        <span className="font-medium text-gray-300 font-semibold text-white">Average Speed</span>
                        <span className="text-gray-500 block">250 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{formatMinutes(stats.readingTimes.average)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <div className="text-xs">
                        <span className="font-medium text-gray-300">Relaxed Speed</span>
                        <span className="text-gray-500 block">200 WPM</span>
                      </div>
                      <span className="text-sm font-bold text-amber-500">{formatMinutes(stats.readingTimes.slow)}</span>
                    </div>
                  </div>
                </div>

                {/* Speech and readability */}
                <div className="space-y-4">
                  
                  {/* Speaking Time */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center shrink-0">
                      <Volume2 size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Speaking / Audiobook Duration</span>
                      <span className="text-lg font-bold text-white">{formatMinutes(stats.speakingTime)}</span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">Estimated at 130 WPM</span>
                    </div>
                  </div>

                  {/* Readability */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/15 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <TrendingUp size={20} className="text-pink-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Readability Grade</span>
                      <span className="text-lg font-bold text-white">{getGradeLevelLabel(stats.readabilityGrade)}</span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">ARI Complexity: Index {stats.readabilityGrade}</span>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* Per page word counts list */}
            {stats.totalPages > 1 && (
              <section className="rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="font-semibold text-gray-300 text-sm">Words per Page Breakdown</h3>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {stats.pageBreakdown.map((page) => {
                    const percentage = Math.round((page.wordCount / maxWordsPerPage) * 100);
                    return (
                      <div key={page.pageNumber} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-14 text-right shrink-0">Page {page.pageNumber}</span>
                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all duration-1000 bg-amber-500/30 border-r border-amber-400/50"
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-16 shrink-0">{page.wordCount.toLocaleString()} w</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white transition-all text-xs"
            >
              Analyze another PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
