"use client";

import { useState, useCallback, useRef } from "react";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import { Archive, FileText, X } from "lucide-react";

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
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
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
    setResult(null);
  }, []);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsCompressing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      setProgress(20);
      setProgressLabel("Loading document...");

      const { PDFDocument } = await import("pdf-lib");
      setProgress(35);
      setProgressLabel("Parsing PDF structure...");

      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      setProgress(55);
      setProgressLabel("Stripping metadata...");

      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");
      setProgress(70);
      setProgressLabel("Rewriting PDF...");

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
      });
      setProgress(85);
      setProgressLabel("Finalizing...");

      setProgress(100);
      setProgressLabel("Complete!");

      const compressedSize = compressedBytes.byteLength;
      const savingsPercent =
        originalSize > 0
          ? ((originalSize - compressedSize) / originalSize) * 100
          : 0;

      const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResult({
        originalSize,
        compressedSize,
        savingsPercent,
        blob,
        fileName: `${baseName}-compressed.pdf`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
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

  return (
    <ToolPageShell
      slug="compress"
      category="popular"
      howItWorksSteps={[
        "Select the PDF you wish to compress.",
        "Click the Compress PDF button to strip metadata.",
        "Download your newly optimized PDF file instantly."
      ]}
    >
      <ToolHeader
        title="Compress PDF"
        description="Reduce PDF file size in seconds by removing unused document metadata."
        slug="compress"
        minPlan="free"
        processing="client"
        output="pdf"
        taskCost={1}
      />

      {file === null && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox onFileSelect={handleFileSelect} />
          <ToolNotice processing="client" />
        </div>
      )}

      {file !== null && !result && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left panel: File detail */}
          <div className="md:col-span-2 bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Selected PDF File</h3>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-xl text-xs font-bold text-slate-500 transition-all border border-slate-200/50"
              >
                <X size={12} /> Clear
              </button>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 max-w-xl mx-auto w-full">
              <FileText size={32} className="text-indigo-650 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Compress Trigger */}
          <div className="space-y-4">
            {isCompressing ? (
              <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-sm space-y-2.5 animate-in">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-indigo-650">{progressLabel}</span>
                  <span className="font-mono font-bold">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <ToolActionButton
                onClick={handleCompress}
                label="Compress PDF"
                icon={<Archive size={15} />}
              />
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="w-full">
          <ToolResultPanel
            title="Compression Successful!"
            subTitle={`Original: ${formatSize(result.originalSize)} · Compressed: ${formatSize(result.compressedSize)} (${result.savingsPercent.toFixed(1)}% saved)`}
            onDownload={handleDownload}
            downloadLabel="Download Compressed PDF"
            onReset={handleReset}
            resetLabel="Compress another PDF"
          />
        </div>
      )}
    </ToolPageShell>
  );
}
