"use client";

import { useState, useCallback, useRef } from "react";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import {
  Merge,
  FileText,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown
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
    <ToolPageShell
      slug="merge"
      category="popular"
      howItWorksSteps={[
        "Upload two or more PDF documents.",
        "Drag or click arrow keys to arrange order.",
        "Click Merge and download the combined PDF."
      ]}
    >
      <ToolHeader
        title="Merge PDF"
        description="Combine multiple PDFs in the order you want with the simplest browser-based merger available."
        slug="merge"
        minPlan="free"
        processing="client"
        output="pdf"
        taskCost={1}
      />

      {files.length === 0 && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox
            onFileSelect={addFiles}
            multiple={true}
            subLabel="PDF · select multiple files"
          />
          <ToolNotice processing="client" />
        </div>
      )}

      {files.length > 0 && !mergedBlob && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left panel: File ordering */}
          <div className="md:col-span-2 bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Arrange Order</h3>
                <p className="text-[10px] text-slate-400">Order from top to bottom for merging.</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={14} /> Add More
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {files.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-white transition-all shadow-sm group"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <FileText size={16} className="text-indigo-650 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{entry.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatFileSize(entry.size)}
                      {entry.pageCount !== null && ` · ${entry.pageCount} pages`}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-45 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveFile(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-slate-150 text-slate-500 disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFile(index, "down")}
                      disabled={index === files.length - 1}
                      className="p-1 rounded hover:bg-slate-150 text-slate-500 disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-655 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Summary & Trigger */}
          <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[260px]">
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-150 pb-2">
                Merge Settings
              </h3>
              <div className="space-y-2.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Total Files</span>
                  <span className="font-extrabold text-slate-800">{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Pages</span>
                  <span className="font-extrabold text-slate-800">{totalPages}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <ToolActionButton
                onClick={handleMerge}
                loading={isMerging}
                label="Merge PDF Files"
                loadingLabel="Merging PDF files..."
                icon={<Merge size={15} />}
              />
            </div>
          </div>
        </div>
      )}

      {mergedBlob && (
        <div className="w-full">
          <ToolResultPanel
            title="PDFs merged successfully!"
            subTitle={`${mergedPageCount} pages · ${formatFileSize(mergedSize)}`}
            onDownload={handleDownload}
            downloadLabel="Download Merged PDF"
            onReset={handleReset}
            resetLabel="Merge another set"
          />
        </div>
      )}
    </ToolPageShell>
  );
}
