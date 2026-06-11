"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyUsageAndGetToken, recordUsageSuccess } from "@/app/utils/usageClient";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import ToolOptionsPanel from "@/app/components/tools/ToolOptionsPanel";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FileText,
  X,
  Loader2
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface PageInfo {
  pageNumber: number;
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl: string;
  selected: boolean;
}

interface RotateResult {
  blob: Blob;
  fileName: string;
  size: number;
}

export default function RotatePdfPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [result, setResult] = useState<RotateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    };
  }, [pages]);

  const renderThumbnails = useCallback(async (data: Uint8Array) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const newPages: PageInfo[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 0.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });
      const url = URL.createObjectURL(blob);

      newPages.push({
        pageNumber: i,
        rotation: 0,
        thumbnailUrl: url,
        selected: false,
      });
    }

    return newPages;
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
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
      setPages([]);
      setIsLoading(true);

      try {
        const arrayBuffer = await f.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);

        const renderedPages = await renderThumbnails(bytes);
        setPages(renderedPages);
      } catch {
        setError("Failed to read PDF. The file may be corrupted or password-protected.");
      } finally {
        setIsLoading(false);
      }
    },
    [renderThumbnails]
  );

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const toggleSelectPage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const allSelected = pages.length > 0 && pages.every((p) => p.selected);
  const someSelected = pages.some((p) => p.selected);

  const toggleSelectAll = () => {
    const newVal = !allSelected;
    setPages((prev) => prev.map((p) => ({ ...p, selected: newVal })));
  };

  const rotatePage = (pageNumber: number, degrees: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber
          ? { ...p, rotation: (p.rotation + degrees + 360) % 360 }
          : p
      )
    );
  };

  const rotateSelected = (degrees: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.selected
          ? { ...p, rotation: (p.rotation + degrees + 360) % 360 }
          : p
      )
    );
  };

  const hasRotations = pages.some((p) => p.rotation !== 0);

  const handleApplyRotation = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      const arrayBuffer = pdfBytes.buffer as ArrayBuffer;
      setProgress(15);
      setProgressLabel("Loading document...");

      const { PDFDocument, degrees } = await import("pdf-lib");
      setProgress(30);
      setProgressLabel("Parsing PDF structure...");

      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      const pageCount = pdfDoc.getPageCount();
      const fileSizeMb = pdfBytes.byteLength / (1024 * 1024);

      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "rotate",
        toolName: "Rotate PDF",
        fileSizeMb,
        pageCount,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsProcessing(false);
        return;
      }

      setProgress(50);
      setProgressLabel("Applying rotations...");

      const pdfPages = pdfDoc.getPages();
      const totalPages = pdfPages.length;

      for (let i = 0; i < totalPages; i++) {
        const pageInfo = pages[i];
        if (pageInfo && pageInfo.rotation !== 0) {
          const currentRotation = pdfPages[i].getRotation().angle;
          pdfPages[i].setRotation(
            degrees((currentRotation + pageInfo.rotation) % 360)
          );
        }
        setProgress(50 + Math.round(((i + 1) / totalPages) * 35));
      }

      setProgressLabel("Saving PDF...");
      const rotatedBytes = await pdfDoc.save();
      setProgress(95);
      setProgressLabel("Finalizing...");

      const recordSuccess = await recordUsageSuccess({
        jobToken: checkResult.jobToken!,
        jobId: checkResult.jobId!,
        toolSlug: "rotate",
        fileSizeMb: rotatedBytes.byteLength / (1024 * 1024),
        pageCount: totalPages,
        fileCount: 1,
      });

      if (!recordSuccess) {
        throw new Error("Failed to record usage event. Please try again.");
      }

      setProgress(100);
      setProgressLabel("Complete!");

      const blob = new Blob([rotatedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file!.name.replace(/\.pdf$/i, "");

      // Sync local tasks cache
      const prevUsed = parseInt(localStorage.getItem("user_tasks_used_today") || "0", 10);
      localStorage.setItem("user_tasks_used_today", String(prevUsed + (checkResult.taskCost || 1)));
      window.dispatchEvent(new Event("storage"));

      setResult({
        blob,
        fileName: `${baseName}-rotated.pdf`,
        size: rotatedBytes.byteLength,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Rotation failed: ${message}`);
    } finally {
      setIsProcessing(false);
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
    pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    setFile(null);
    setPdfBytes(null);
    setPages([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsProcessing(false);
    setIsLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ToolPageShell
      slug="rotate"
      category="popular"
      howItWorksSteps={[
        "Upload the PDF document you want to rotate.",
        "Select specific pages and click CCW, CW, or 180° rotation triggers.",
        "Apply the rotations and download your rotated PDF file."
      ]}
    >
      <ToolHeader
        title="Rotate PDF"
        description="Rotate scanning orientation of individual pages or the entire PDF."
        slug="rotate"
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

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-slate-500">Generating page previews...</span>
        </div>
      )}

      {file !== null && pages.length > 0 && !result && (
        <div className="w-full space-y-6">
          <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select All</span>
              </label>
              <div className="w-px h-6 bg-slate-200" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rotate selected:</span>
              <button
                disabled={!someSelected}
                onClick={() => rotateSelected(-90)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-650 transition-all disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw size={12} /> 90° CCW
              </button>
              <button
                disabled={!someSelected}
                onClick={() => rotateSelected(90)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-650 transition-all disabled:opacity-30 cursor-pointer"
              >
                <RotateCw size={12} /> 90° CW
              </button>
              <button
                disabled={!someSelected}
                onClick={() => rotateSelected(180)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-650 transition-all disabled:opacity-30 cursor-pointer"
              >
                <FlipHorizontal size={12} /> 180°
              </button>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-xl text-xs font-bold text-slate-500 transition-all border border-slate-200/50 cursor-pointer"
            >
              <X size={12} /> Clear File
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
              <X size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid list of page previews */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                onClick={() => toggleSelectPage(page.pageNumber)}
                className={`relative rounded-2xl border p-3 transition-all cursor-pointer bg-white ${
                  page.selected
                    ? "border-indigo-600 ring-2 ring-indigo-500/10 shadow-md"
                    : "border-slate-200 hover:border-indigo-500/30 hover:shadow-md"
                }`}
              >
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={page.selected}
                    onChange={() => toggleSelectPage(page.pageNumber)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-350 bg-white text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600"
                  />
                </div>

                {page.rotation !== 0 && (
                  <div className="absolute top-4 right-4 z-10 px-2 py-0.5 rounded-lg bg-indigo-600 text-[9px] font-black text-white uppercase tracking-wider">
                    {page.rotation}°
                  </div>
                )}

                <div className="flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200 aspect-[3/4] mb-3">
                  <img
                    src={page.thumbnailUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                    draggable={false}
                  />
                </div>

                <p className="text-xs text-center text-slate-600 font-extrabold mb-3">
                  Page {page.pageNumber}
                </p>

                <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => rotatePage(page.pageNumber, -90)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={() => rotatePage(page.pageNumber, 90)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Rotate 90° CW"
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    onClick={() => rotatePage(page.pageNumber, 180)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Rotate 180°"
                  >
                    <FlipHorizontal size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm mx-auto pt-6">
            {isProcessing ? (
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
                onClick={handleApplyRotation}
                disabled={!hasRotations}
                label="Apply Rotation &amp; Generate PDF"
                icon={<RotateCw size={15} />}
              />
            )}
            {!hasRotations && (
              <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider mt-2.5">
                Rotate at least one page to compile the PDF.
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="w-full">
          <ToolResultPanel
            title="Rotations applied successfully!"
            subTitle={`${pages.length} pages total · ${pages.filter((p) => p.rotation !== 0).length} rotated`}
            onDownload={handleDownload}
            downloadLabel="Download Rotated PDF"
            onReset={handleReset}
            resetLabel="Rotate another PDF"
          />
        </div>
      )}
    </ToolPageShell>
  );
}
