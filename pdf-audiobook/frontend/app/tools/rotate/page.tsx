"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  RotateCw,
  RotateCcw,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  FlipHorizontal,
} from "lucide-react";

// pdfjs-dist imported dynamically in renderThumbnails

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface PageInfo {
  pageNumber: number;
  rotation: number; // cumulative rotation in degrees (0, 90, 180, 270)
  thumbnailUrl: string;
  selected: boolean;
}

interface RotateResult {
  blob: Blob;
  fileName: string;
  size: number;
}

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [result, setResult] = useState<RotateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup thumbnail URLs on unmount or reset
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (
        f.type !== "application/pdf" &&
        !f.name.toLowerCase().endsWith(".pdf")
      ) {
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
        setError(
          "Failed to read PDF. The file may be corrupted or password-protected."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [renderThumbnails]
  );

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

  // ── Selection ──────────────────────────────────────────────────
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

  // ── Rotation ───────────────────────────────────────────────────
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

  // ── Apply and Download ─────────────────────────────────────────
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

      const blob = new Blob([rotatedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file!.name.replace(/\.pdf$/i, "");

      setProgress(100);
      setProgressLabel("Complete!");

      setResult({
        blob,
        fileName: `${baseName}-rotated.pdf`,
        size: rotatedBytes.byteLength,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
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

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Mic size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">DocuSafe PDF</span>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
              <RotateCw size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Rotate PDF</h1>
          </div>
          <p className="text-gray-400">
            Rotate individual pages or all pages of your PDF. Preview each page,
            choose your rotation, and download the result. Everything runs in
            your browser — your files never leave your device.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${
                isDragActive
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
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
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-purple-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatSize(file.size)} · {pages.length} page
                    {pages.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">
                  Drop your PDF here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse · max 100 MB
                </p>
              </>
            )}
          </div>

          {/* Loading thumbnails indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 pt-2">
              <Loader2 size={18} className="animate-spin text-purple-400" />
              <span className="text-sm text-gray-400">
                Rendering page previews…
              </span>
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Configure Rotation */}
        {pages.length > 0 && !result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
                2
              </span>
              Select &amp; Rotate Pages
            </h2>

            {/* Bulk controls */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              {/* Select All */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400/50 focus:ring-offset-0 accent-purple-500"
                />
                <span className="text-sm text-gray-300">Select All</span>
              </label>

              <div className="w-px h-6 bg-white/10" />

              {/* Bulk rotate buttons */}
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Rotate selected:
              </span>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(-90)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 90° counter-clockwise"
              >
                <RotateCcw size={14} />
                90° CCW
              </button>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(90)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 90° clockwise"
              >
                <RotateCw size={14} />
                90° CW
              </button>
              <button
                type="button"
                disabled={!someSelected}
                onClick={() => rotateSelected(180)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:text-purple-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 180°"
              >
                <FlipHorizontal size={14} />
                180°
              </button>
            </div>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className={`group relative rounded-xl border p-2 transition-all cursor-pointer ${
                    page.selected
                      ? "border-purple-400/60 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                  onClick={() => toggleSelectPage(page.pageNumber)}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={page.selected}
                      onChange={() => toggleSelectPage(page.pageNumber)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400/50 focus:ring-offset-0 accent-purple-500"
                    />
                  </div>

                  {/* Rotation badge */}
                  {page.rotation !== 0 && (
                    <div className="absolute top-3 right-3 z-10 px-1.5 py-0.5 rounded-md bg-purple-500/80 text-[10px] font-bold text-white">
                      {page.rotation}°
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="flex items-center justify-center overflow-hidden rounded-lg bg-gray-900 aspect-[3/4] mb-2">
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="max-w-full max-h-full object-contain transition-transform duration-300"
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Page number */}
                  <p className="text-xs text-center text-gray-400 mb-2">
                    Page {page.pageNumber}
                  </p>

                  {/* Per-page rotate controls */}
                  <div
                    className="flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, -90)}
                      className="p-1.5 rounded-md border border-white/10 bg-white/5 text-gray-400 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 90° CCW"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, 90)}
                      className="p-1.5 rounded-md border border-white/10 bg-white/5 text-gray-400 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 90° CW"
                    >
                      <RotateCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.pageNumber, 180)}
                      className="p-1.5 rounded-md border border-white/10 bg-white/5 text-gray-400 hover:border-purple-400/40 hover:text-purple-300 transition-all"
                      title="Rotate 180°"
                    >
                      <FlipHorizontal size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply button or progress */}
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-purple-400"
                  />
                  <span className="text-sm text-gray-300">
                    {progressLabel}
                  </span>
                  <span className="ml-auto text-sm text-gray-500">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #a855f7, #c084fc)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyRotation}
                disabled={!hasRotations}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#a855f7" }}
                onMouseEnter={(e) => {
                  if (hasRotations)
                    e.currentTarget.style.backgroundColor = "#9333ea";
                }}
                onMouseLeave={(e) => {
                  if (hasRotations)
                    e.currentTarget.style.backgroundColor = "#a855f7";
                }}
              >
                <RotateCw size={20} />
                Apply Rotation &amp; Generate PDF
              </button>
            )}

            {!hasRotations && (
              <p className="text-xs text-gray-500 text-center">
                Rotate at least one page to enable the button.
              </p>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-medium">Rotation complete!</span>
            </div>

            {/* File info */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-4">
              <FileText size={24} className="text-purple-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white truncate">
                  {result.fileName}
                </p>
                <p className="text-sm text-gray-400">
                  {formatSize(result.size)} ·{" "}
                  {pages.filter((p) => p.rotation !== 0).length} page
                  {pages.filter((p) => p.rotation !== 0).length !== 1
                    ? "s"
                    : ""}{" "}
                  rotated
                </p>
              </div>
            </div>

            {/* Rotation summary */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Rotation Summary
              </p>
              <div className="flex flex-wrap gap-2">
                {pages
                  .filter((p) => p.rotation !== 0)
                  .map((p) => (
                    <span
                      key={p.pageNumber}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/15 border border-purple-400/20 text-xs text-purple-300"
                    >
                      Page {p.pageNumber}: {p.rotation}°
                    </span>
                  ))}
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#a855f7" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#9333ea")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#a855f7")
              }
            >
              <Download size={20} />
              Download Rotated PDF
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Rotate another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
