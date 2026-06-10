"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scissors,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
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
  const router = useRouter();
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

  // App header states (synced with localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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

  return (
    <div 
      className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative font-sans flex flex-col justify-between"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-pink-600/10 blur-[130px] top-[-20%] left-[-10%] mix-blend-screen" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[140px] bottom-[-20%] right-[-10%] mix-blend-screen" />
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-pink-950/80 backdrop-blur-md border-4 border-dashed border-pink-500 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload size={54} className="text-pink-400 animate-bounce mb-4" />
          <p className="text-2xl font-extrabold text-white">Drop PDF anywhere to upload</p>
          <p className="text-sm text-pink-300/80 mt-1">Split locally in your browser</p>
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
            <Link href="/tools/split" className="text-white transition-colors uppercase tracking-wider text-[11px] border-b-2 border-pink-500 pb-0.5">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-white transition-colors uppercase tracking-wider text-[11px]">Compress PDF</Link>
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
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-400/20 flex items-center justify-center mx-auto shadow-inner shadow-pink-500/5">
                <Scissors size={22} className="text-pink-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Split PDF file</h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
                Split a PDF into individual pages or custom ranges.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="group relative px-10 py-5 bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 shrink-0"
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
            <div className="flex-1 space-y-5 bg-white/[0.01] border border-white/5 p-6 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-2">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Selected PDF File</h2>
                  <p className="text-xs text-gray-500">Ready to split pages and extract sections.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-xs font-bold text-gray-400 transition-all border border-white/5"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              {/* Selected File Card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden max-w-xl mx-auto w-full mb-4">
                <FileText size={36} className="text-pink-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)} · {totalPages} page{totalPages !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Range instructions if needed */}
              {splitMode === "custom-ranges" && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/5 max-w-xl mx-auto w-full text-xs text-gray-400">
                  <AlertTriangle size={15} className="text-pink-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Custom Range Syntax:</span> Enter page numbers separated by commas (e.g. <span className="text-gray-300">1, 3, 5</span>) or ranges (e.g. <span className="text-gray-300">2-4, 6-9</span>). Each entry splits into a separate document.
                  </div>
                </div>
              )}

              {/* Error box */}
              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mt-2 max-w-xl mx-auto w-full animate-in">
                  <X size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Right: Actions / Results Panel (Sidebar style) */}
            <div className="w-full lg:w-80 bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Split Settings</h3>
                </div>

                {!results && (
                  <div className="space-y-4">
                    {/* Toggle split modes */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Split Mode</label>
                      <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-white/5 border border-white/5 rounded-xl text-[10px]">
                        <button
                          onClick={() => setSplitMode("every-page")}
                          className={`py-1.5 rounded-lg font-bold transition-all ${splitMode === "every-page" ? "bg-white/10 text-white" : "text-gray-400"}`}
                        >
                          Split Every Page
                        </button>
                        <button
                          onClick={() => setSplitMode("custom-ranges")}
                          className={`py-1.5 rounded-lg font-bold transition-all ${splitMode === "custom-ranges" ? "bg-white/10 text-white" : "text-gray-400"}`}
                        >
                          Custom Ranges
                        </button>
                      </div>
                    </div>

                    {/* Range input */}
                    {splitMode === "custom-ranges" && (
                      <div className="space-y-1.5 animate-in">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Enter Ranges</label>
                        <input
                          type="text"
                          value={rangeInput}
                          onChange={(e) => setRangeInput(e.target.value)}
                          placeholder="e.g. 1-3, 5, 7-10"
                          className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {results && (
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Total Output Files</span>
                      <span className="font-bold text-white">{results.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ZIP File Size</span>
                      <span className="font-bold text-white">{zipBlob ? formatFileSize(zipBlob.size) : ""}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions trigger */}
              <div className="space-y-3">
                {!results ? (
                  <div className="space-y-4">
                    {isProcessing ? (
                      <div className="space-y-3 animate-in">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-pink-400" /> Processing pages...</span>
                          <span className="font-mono font-bold">{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: "#ec4899",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleSplit}
                        disabled={splitMode === "custom-ranges" && rangeInput.trim() === ""}
                        className="w-full py-4 rounded-xl font-extrabold text-sm bg-pink-500 hover:bg-[#db2777] text-white transition-all shadow-lg shadow-pink-500/10 flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        <Scissors size={16} />
                        Split PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 animate-in">
                    <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-white">Split Complete!</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Extracted {results.length} documents.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="w-full py-4 rounded-xl font-extrabold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Download size={16} />
                      Download ZIP Archive
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white font-bold transition-all"
                    >
                      Split another PDF
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
