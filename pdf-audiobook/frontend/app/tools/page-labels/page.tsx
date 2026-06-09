"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Tags,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  Plus,
  Trash2,
} from "lucide-react";

interface LabelRange {
  id: string;
  startPage: number; // 1-indexed
  prefix: string;
  style: "D" | "R" | "r" | "A" | "a" | "none";
  startNum: number;
}

export default function PageLabels() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranges, setRanges] = useState<LabelRange[]>([]);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    setDownloadUrl(null);
    setRanges([]);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      setPdfBytes(arrayBuffer);
      
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pagesCount = pdfDoc.getPageCount();
      
      setTotalPages(pagesCount);
      setFile(f);
      
      // Seed initial range for page 1
      setRanges([
        {
          id: Math.random().toString(36).substring(7),
          startPage: 1,
          prefix: "Page ",
          style: "D",
          startNum: 1,
        },
      ]);
    } catch (err: any) {
      setError(`Failed to read PDF file: ${err.message || err}`);
    }
  }, []);

  const addRange = () => {
    setRanges((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        startPage: Math.min(totalPages, prev[prev.length - 1]?.startPage + 1 || 1),
        prefix: "",
        style: "D",
        startNum: 1,
      },
    ]);
  };

  const removeRange = (id: string) => {
    setRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRange = (id: string, updates: Partial<LabelRange>) => {
    setRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const applyLabels = async () => {
    if (!pdfBytes || ranges.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const { PDFDocument, PDFName } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const context = pdfDoc.context;
      
      // Sort ranges by startPage ascending
      const sortedRanges = [...ranges].sort((a, b) => a.startPage - b.startPage);
      
      // Validate page numbers
      for (const r of sortedRanges) {
        if (r.startPage < 1 || r.startPage > totalPages) {
          throw new Error(`Start page ${r.startPage} is out of bounds (1-${totalPages}).`);
        }
      }

      // Build Low-level Nums array for PageLabels
      // e.g. Nums: [0, LabelDict1, 3, LabelDict2]
      const numsArray: any[] = [];
      
      sortedRanges.forEach((r) => {
        const pageIdx = r.startPage - 1; // 0-indexed page index
        const labelDict: any = {};
        
        if (r.prefix) {
          labelDict.P = context.obj(r.prefix);
        }
        
        if (r.style !== "none") {
          labelDict.S = PDFName.of(r.style);
        }
        
        if (r.startNum !== 1) {
          labelDict.St = context.obj(r.startNum);
        }
        
        numsArray.push(context.obj(pageIdx));
        numsArray.push(context.obj(labelDict));
      });

      const pageLabelsDict = context.obj({
        Nums: context.obj(numsArray),
      });

      pdfDoc.catalog.set(PDFName.of("PageLabels"), pageLabelsDict);

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: any) {
      setError(`Failed to apply page labels: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Tags size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Tags size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Smart Page Labels</h1>
          </div>
          <p className="text-gray-400">
            Define logical section labels (e.g. Cover, Preface, Appendix) or Roman/Alphabetic styles so viewers display structured page labels instead of just 1, 2, 3.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
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
              <p className="text-sm text-white font-medium">Click or drag PDF here</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 text-purple-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{totalPages} pages · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setRanges([]);
                  setDownloadUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        {/* Labels Editor */}
        {file && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-300 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center font-bold">2</span>
                Configure Label Ranges
              </h2>
              <button
                onClick={addRange}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-xs font-semibold text-purple-300 transition-colors"
              >
                <Plus size={14} /> Add Label Range
              </button>
            </div>

            <div className="space-y-4">
              {ranges.map((r, index) => (
                <div key={r.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-white/5 border border-white/10 rounded-xl items-center">
                  
                  {/* Start Page */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Starts Page</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={r.startPage}
                      onChange={(e) => updateRange(r.id, { startPage: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white"
                    />
                  </div>

                  {/* Prefix Text */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Label Prefix</label>
                    <input
                      type="text"
                      placeholder="e.g. Cover, Appendix-"
                      value={r.prefix}
                      onChange={(e) => updateRange(r.id, { prefix: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white"
                    />
                  </div>

                  {/* Numbering Style */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Numbering Style</label>
                    <select
                      value={r.style}
                      onChange={(e) => updateRange(r.id, { style: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="D">1, 2, 3 (Arabic)</option>
                      <option value="R">I, II, III (Roman Upper)</option>
                      <option value="r">i, ii, iii (Roman Lower)</option>
                      <option value="A">A, B, C (Letters Upper)</option>
                      <option value="a">a, b, c (Letters Lower)</option>
                      <option value="none">No numbers (prefix only)</option>
                    </select>
                  </div>

                  {/* Start numbering at */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Start Num</label>
                    <input
                      type="number"
                      min={1}
                      disabled={r.style === "none"}
                      value={r.startNum}
                      onChange={(e) => updateRange(r.id, { startNum: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white disabled:opacity-40"
                    />
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-2 flex justify-end pt-4 sm:pt-0">
                    <button
                      onClick={() => removeRange(r.id)}
                      disabled={index === 0 && ranges.length === 1}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_labeled.pdf` : "labeled.pdf"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={16} /> Download Labeled PDF
                </a>
              )}
              
              <button
                onClick={applyLabels}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Applying Labels...
                  </>
                ) : (
                  "Apply Labels"
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
                {error}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
