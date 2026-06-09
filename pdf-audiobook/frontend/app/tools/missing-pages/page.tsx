"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileWarning,
  Upload,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface MissingPageReport {
  totalPages: number;
  detectedSequence: number[];
  missingPages: number[];
  duplicatePages: number[];
  wrongOrder: boolean;
  warnings: string[];
}

export default function MissingPagesDetector() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MissingPageReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractPageNumbersFromText = (text: string): number | null => {
    // Attempt to match patterns like "Page X of Y", "Page X", "X / Y", etc.
    const patterns = [
      /\b(?:page|pg\.?)\s*(\d+)\b/i,
      /\b(\d+)\s*\/\s*\d+\b/,
      /\b(\d+)\s*of\s*\d+\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) return num;
      }
    }

    // Fallback: look at the last few lines or first few lines for isolated numbers
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];
      
      const numFirst = parseInt(firstLine, 10);
      if (!isNaN(numFirst) && numFirst > 0 && numFirst < 10000 && /^\d+$/.test(firstLine)) return numFirst;

      const numLast = parseInt(lastLine, 10);
      if (!isNaN(numLast) && numLast > 0 && numLast < 10000 && /^\d+$/.test(lastLine)) return numLast;
    }

    return null;
  };

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setReport(null);
  }, []);

  const runAnalysis = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading PDF document...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const sequence: number[] = [];
      const warnings: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Scanning page ${i} text...`);
        setProgress(Math.round((i / numPages) * 90));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join("\n");
        
        const pageNum = extractPageNumbersFromText(pageText);
        sequence.push(pageNum !== null ? pageNum : -1); // -1 if not found
      }

      setProgressLabel("Analyzing page numbers...");
      setProgress(95);

      // Analyze page number sequence
      const validNumbers = sequence.filter(n => n !== -1);
      const uniqueNumbers = Array.from(new Set(validNumbers));
      
      let missing: number[] = [];
      let duplicates: number[] = [];
      let wrongOrder = false;

      if (validNumbers.length > 0) {
        const minNum = Math.min(...validNumbers);
        const maxNum = Math.max(...validNumbers);

        // Calculate missing
        for (let num = minNum; num <= maxNum; num++) {
          if (!uniqueNumbers.includes(num)) {
            missing.push(num);
          }
        }

        // Calculate duplicates
        const seen = new Set<number>();
        validNumbers.forEach(n => {
          if (seen.has(n)) duplicates.push(n);
          else seen.add(n);
        });
        duplicates = Array.from(new Set(duplicates));

        // Check order
        for (let idx = 1; idx < validNumbers.length; idx++) {
          if (validNumbers[idx] < validNumbers[idx - 1]) {
            wrongOrder = true;
            break;
          }
        }
      } else {
        warnings.push("No printed page numbers were detected in the text layer of this PDF.");
      }

      // Add descriptive warning notes
      if (sequence.includes(-1) && validNumbers.length > 0) {
        const missingTextCount = sequence.filter(n => n === -1).length;
        warnings.push(`${missingTextCount} pages did not have clear page number markers text found.`);
      }
      if (missing.length > 0) {
        warnings.push(`Detected gaps in numbering. Missing pages: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
      }
      if (duplicates.length > 0) {
        warnings.push(`Detected duplicate page numbers: ${duplicates.join(", ")}`);
      }
      if (wrongOrder) {
        warnings.push("Extracted page numbers are out of sequential order.");
      }

      setReport({
        totalPages: numPages,
        detectedSequence: sequence,
        missingPages: missing,
        duplicatePages: duplicates,
        wrongOrder,
        warnings,
      });
      setProgress(100);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FileWarning size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center">
              <FileWarning size={20} className="text-pink-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Missing Page Detector</h1>
          </div>
          <p className="text-gray-400">
            Inspect the text of a scanned or compiled PDF to check if page sequences are missing, repeated, or out of order.
          </p>
        </div>

        {/* Upload Area */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) handleFile(dropped);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-pink-500/50 hover:bg-pink-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-gray-500 mb-4 animate-bounce" size={36} />
              <p className="text-sm text-white font-medium">Click or drag PDF here to scan</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20 text-pink-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setReport(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !report && (
            <div className="flex justify-end">
              <button
                onClick={runAnalysis}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Analyze Sequences
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-pink-400" />
                  {progressLabel}
                </span>
                <span className="text-pink-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {report && (
          <section className="space-y-6">
            <h2 className="font-semibold text-white text-lg">Sequence Report</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Rendered Pages</p>
                <p className="text-2xl font-bold text-white">{report.totalPages}</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Missing Gaps</p>
                <p className={`text-2xl font-bold ${report.missingPages.length > 0 ? "text-red-400" : "text-green-400"}`}>
                  {report.missingPages.length}
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Duplicate Numbers</p>
                <p className={`text-2xl font-bold ${report.duplicatePages.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {report.duplicatePages.length}
                </p>
              </div>
            </div>

            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <AlertTriangle size={16} className={report.warnings.length > 0 ? "text-yellow-400" : "text-green-400"} />
                Findings & Warnings
              </h3>

              {report.warnings.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-300 pl-4 list-disc">
                  {report.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 p-3.5 rounded-xl">
                  <CheckCircle2 size={16} />
                  Sequence check passed! All detected page numbers are sequential with no missing pages.
                </div>
              )}
            </div>

            {/* Complete Sequence Log */}
            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-white">Extracted Page Marking Map</h3>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {report.detectedSequence.map((num, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-center text-xs border ${
                      num === -1
                        ? "bg-white/5 border-white/10 text-gray-500"
                        : report.duplicatePages.includes(num)
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                        : report.missingPages.includes(num + 1)
                        ? "bg-red-500/10 border-red-500/20 text-red-300"
                        : "bg-green-500/10 border-green-500/20 text-green-300"
                    }`}
                  >
                    <div className="text-[10px] text-gray-500">Page {idx + 1}</div>
                    <div className="font-bold mt-0.5">{num === -1 ? "?" : num}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
