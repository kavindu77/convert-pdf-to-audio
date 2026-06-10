"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
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
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // App header states (synced with localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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
    <div 
      className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-cyan-600/10 blur-[130px] top-[-20%] left-[-10%] mix-blend-screen" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[140px] bottom-[-20%] right-[-10%] mix-blend-screen" />
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-cyan-950/80 backdrop-blur-md border-4 border-dashed border-cyan-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-cyan-400 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-white">Drop PDF anywhere to upload</p>
          <p className="text-sm text-cyan-300/80 mt-1">Compress locally in your browser</p>
        </div>
      )}

      {/* Header (Same as Homepage) */}
      <header className="sticky top-0 relative border-b border-white/5 px-6 py-3.5 flex items-center justify-between z-40 backdrop-blur-md bg-gray-950/80">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              DocuSafe<span className="text-indigo-400 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-[13px] font-bold text-gray-400/90">
            <Link href="/tools/merge" className="hover:text-white transition-colors uppercase tracking-wider text-[11px]">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-white transition-colors uppercase tracking-wider text-[11px]">Split PDF</Link>
            <Link href="/tools/compress" className="text-white transition-colors uppercase tracking-wider text-[11px] border-b-2 border-cyan-500 pb-0.5">Compress PDF</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-gray-300 font-medium">{userName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-7xl mx-auto w-full">
        
        {/* State 1: Upload (Empty State matching iLovePDF) */}
        {file === null && (
          <div className="w-full max-w-3xl text-center space-y-8 animate-in">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto shadow-inner shadow-cyan-500/5">
                <Archive size={22} className="text-cyan-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Compress PDF file</h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
                Reduce file size while optimizing for maximal PDF quality.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={onFileSelect}
                className="hidden"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="group relative px-10 py-5 bg-[#06b6d4] hover:bg-[#0891b2] text-white font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 shrink-0"
              >
                <Upload size={22} className="group-hover:scale-110 transition-transform duration-200" />
                Select PDF file
              </button>
              
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold pt-1">
                or drop PDF here
              </p>
            </div>

            <p className="text-[11px] text-gray-600 max-w-sm mx-auto bg-white/[0.01] border border-white/5 py-1.5 px-3 rounded-xl">
              🛡️ Processing runs 100% locally in your browser. Files never touch our servers.
            </p>
          </div>
        )}

        {/* State 2: Document Workspace (Active State) */}
        {file !== null && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch animate-in">
            
            {/* Left: Document View */}
            <div className="flex-1 space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-2">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Selected PDF File</h2>
                  <p className="text-xs text-gray-500">Ready to compress and optimize layout.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-xs font-bold text-gray-400 transition-all border border-white/5"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              {/* Selected File Card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden max-w-xl mx-auto w-full">
                <FileText size={36} className="text-cyan-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
              </div>

              {/* Error box */}
              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mt-3 max-w-xl mx-auto w-full animate-in">
                  <X size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Actions / Results Panel (Sidebar style) */}
            <div className="w-full lg:w-80 bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Compression Engine</h3>
                </div>

                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Compress Mode</span>
                    <span className="font-bold text-cyan-400">Browser-Optimized</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Weight</span>
                    <span className="font-bold text-white">{formatSize(file.size)}</span>
                  </div>
                </div>
              </div>

              {/* Compression actions */}
              <div className="space-y-3">
                {!result ? (
                  <div className="space-y-4">
                    {isCompressing ? (
                      <div className="space-y-3 animate-in">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-cyan-400" /> {progressLabel}</span>
                          <span className="font-mono font-bold">{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${progress}%`,
                              background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleCompress}
                        className="w-full py-4 rounded-xl font-extrabold text-sm bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                      >
                        <Archive size={16} />
                        Compress PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 animate-in">
                    <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-white">Optimize Complete!</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Stripped structural trackers.</p>
                      </div>
                    </div>

                    {/* Results data breakdown */}
                    <div className="space-y-2 rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Original:</span>
                        <span className="font-bold text-gray-400">{formatSize(result.originalSize)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Compressed:</span>
                        <span className="font-bold text-cyan-400">{formatSize(result.compressedSize)}</span>
                      </div>
                      
                      {/* Savings percentage breakdown */}
                      {(() => {
                        const colors = getSavingsColor(result.savingsPercent);
                        const displayPercent = Math.max(0, result.savingsPercent);
                        return (
                          <div className={`mt-2 border-t border-white/5 pt-2 flex items-center justify-between text-xs font-bold ${colors.text}`}>
                            <span className="flex items-center gap-1.5"><TrendingDown size={14} /> Size Reduced</span>
                            <span>{displayPercent.toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-4 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={16} />
                      Download compressed PDF
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white font-bold transition-all"
                    >
                      Compress another PDF
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-4 px-6 relative z-10 bg-gray-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-600">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
