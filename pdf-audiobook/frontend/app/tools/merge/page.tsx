"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Merge,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
  ChevronUp,
  ChevronDown,
  Mic,
  CheckCircle2,
} from "lucide-react";

interface PDFFileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFileEntry[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedSize, setMergedSize] = useState<number>(0);
  const [mergedPageCount, setMergedPageCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPageCount = async (file: File): Promise<number | null> => {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return pdf.getPageCount();
    } catch {
      return null;
    }
  };

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      setError(null);
      setMergedBlob(null);

      const pdfFiles = newFiles.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        setError("Only PDF files are accepted.");
        return;
      }

      const entries: PDFFileEntry[] = await Promise.all(
        pdfFiles.map(async (file) => {
          const pageCount = await loadPageCount(file);
          return {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            pageCount,
          };
        })
      );

      setFiles((prev) => [...prev, ...entries]);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedBlob(null);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setMergedBlob(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsMerging(true);
    setError(null);
    setMergedBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const entry of files) {
        const buffer = await entry.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });

      setMergedBlob(blob);
      setMergedSize(blob.size);
      setMergedPageCount(mergedPdf.getPageCount());
    } catch (err: any) {
      console.error("Merge error:", err);
      setError(err?.message || "Failed to merge PDFs. Please check your files and try again.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFiles([]);
    setMergedBlob(null);
    setMergedSize(0);
    setMergedPageCount(0);
    setError(null);
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);

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
            <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center">
              <Merge size={20} className="text-[#8b5cf6]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Merge PDF</h1>
          </div>
          <p className="text-gray-400">Combine multiple PDF files into a single document.</p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6] text-xs flex items-center justify-center">
              1
            </span>
            Upload PDFs
          </h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragOver
                ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload size={32} className="mx-auto mb-3 text-gray-500" />
            <p className="text-gray-300 font-medium">Drop your PDF files here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse · multiple files allowed</p>
          </div>
        </section>

        {/* Step 2: Reorder */}
        {files.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6] text-xs flex items-center justify-center">
                2
              </span>
              Arrange Order
              <span className="ml-auto text-sm text-gray-500 font-normal">
                {files.length} file{files.length !== 1 ? "s" : ""} · {totalPages} page{totalPages !== 1 ? "s" : ""}
              </span>
            </h2>

            <div className="space-y-2">
              {files.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-white/20 transition-colors"
                >
                  {/* Order number */}
                  <span className="w-6 h-6 rounded-md bg-white/10 text-gray-400 text-xs flex items-center justify-center font-mono shrink-0">
                    {index + 1}
                  </span>

                  {/* File icon */}
                  <FileText size={18} className="text-[#8b5cf6] shrink-0" />

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(entry.size)}
                      {entry.pageCount !== null && (
                        <span> · {entry.pageCount} page{entry.pageCount !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>

                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveFile(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFile(index, "down")}
                      disabled={index === files.length - 1}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all shrink-0"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-gray-500 hover:border-white/30 hover:text-white text-sm transition-all flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              Add more files
            </button>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <X size={18} className="shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Merge button */}
        {files.length >= 2 && !mergedBlob && (
          <button
            type="button"
            disabled={isMerging}
            onClick={handleMerge}
            className="w-full py-4 rounded-2xl font-semibold text-lg bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isMerging ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Merging {files.length} files...
              </>
            ) : (
              <>
                <Merge size={20} />
                Merge {files.length} PDFs
              </>
            )}
          </button>
        )}

        {/* Result */}
        {mergedBlob && (
          <section className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-green-400" />
              <div>
                <p className="font-semibold text-white">Merge Complete!</p>
                <p className="text-sm text-gray-400">
                  {mergedPageCount} page{mergedPageCount !== 1 ? "s" : ""} · {formatFileSize(mergedSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <FileText size={20} className="text-[#8b5cf6]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">merged.pdf</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(mergedSize)} · {mergedPageCount} pages
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] font-semibold text-sm transition-all"
              >
                <Download size={16} />
                Download
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Merge more PDFs
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
