"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Image,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
} from "lucide-react";

interface PageImage {
  pageNum: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

const SCALE_OPTIONS = [
  { label: "1× (72 dpi)", value: 1 },
  { label: "2× (150 dpi)", value: 2 },
  { label: "3× (300 dpi)", value: 3 },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(2);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [images, setImages] = useState<PageImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setError(null);
      setImages([]);
      setIsDone(false);
    } else {
      setError("Only PDF files are accepted.");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        setFile(selected);
        setError(null);
        setImages([]);
        setIsDone(false);
      }
    },
    []
  );

  const handleConvert = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setImages([]);
    setIsDone(false);
    setProgress({ current: 0, total: 0 });

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const renderedImages: PageImage[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        const url = URL.createObjectURL(blob);

        const pageImage: PageImage = {
          pageNum,
          blob,
          url,
          width: viewport.width,
          height: viewport.height,
        };

        renderedImages.push(pageImage);
        setImages((prev) => [...prev, pageImage]);
        setProgress({ current: pageNum, total: totalPages });
      }

      setIsDone(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to convert PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingle = (img: PageImage) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = `page-${img.pageNum}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllZip = async () => {
    if (images.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const img of images) {
      zip.file(`page-${img.pageNum}.png`, img.blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file?.name?.replace(/\.pdf$/i, "") || "pdf-images";
    a.download = `${baseName}-images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setFile(null);
    setImages([]);
    setIsDone(false);
    setError(null);
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalSize = images.reduce((acc, img) => acc + img.blob.size, 0);

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
          <span className="font-semibold text-lg tracking-tight">
            PDF to Audio
          </span>
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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Image size={22} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF to Images</h1>
          </div>
          <p className="text-gray-400">
            Convert each page of your PDF into a high-quality PNG image. Everything runs locally in your browser — your files never leave your device.
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
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${
                isDragOver
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-amber-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(file.size)}
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
                  or click to browse
                </p>
              </>
            )}
          </div>
        </section>

        {/* Step 2: Options */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center">
              2
            </span>
            Image Quality
          </h2>

          <div className="flex gap-3">
            {SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScale(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${
                    scale === opt.value
                      ? "bg-amber-500 border-amber-400 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Higher scale = larger images & better quality. 2× is recommended for
            most uses.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Convert button */}
        {!isDone && (
          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleConvert}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isProcessing ? undefined : "#f59e0b",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing)
                (e.target as HTMLElement).style.backgroundColor = "#d97706";
            }}
            onMouseLeave={(e) => {
              if (!isProcessing)
                (e.target as HTMLElement).style.backgroundColor = "#f59e0b";
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Image size={20} />
                Convert to Images
              </>
            )}
          </button>
        )}

        {/* Progress */}
        {isProcessing && progress.total > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-amber-400" />
                <span className="font-medium">Rendering pages...</span>
              </div>
              <span className="text-sm text-gray-400">
                Page {progress.current} of {progress.total}
              </span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  backgroundColor: "#f59e0b",
                }}
              />
            </div>

            <p className="text-xs text-gray-500">
              {Math.round((progress.current / progress.total) * 100)}% complete
            </p>
          </section>
        )}

        {/* Live thumbnail previews (shown during processing) */}
        {isProcessing && images.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 text-sm">Preview</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div
                  key={img.pageNum}
                  className="rounded-lg overflow-hidden border border-white/10 bg-white/5"
                >
                  <img
                    src={img.url}
                    alt={`Page ${img.pageNum}`}
                    className="w-full h-auto"
                  />
                  <div className="px-2 py-1.5 text-xs text-gray-400 text-center">
                    Page {img.pageNum}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {isDone && images.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-400" />
                <span className="font-medium">
                  {images.length} page{images.length !== 1 ? "s" : ""} converted
                </span>
              </div>
              <span className="text-sm text-gray-400">
                Total: {formatFileSize(totalSize)}
              </span>
            </div>

            {/* Download All ZIP */}
            <button
              type="button"
              onClick={downloadAllZip}
              className="w-full py-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#f59e0b" }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.backgroundColor = "#d97706")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.backgroundColor = "#f59e0b")
              }
            >
              <Download size={18} />
              Download All as ZIP
            </button>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img) => (
                <div
                  key={img.pageNum}
                  className="group rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-400/40 transition-all"
                >
                  <div className="relative">
                    <img
                      src={img.url}
                      alt={`Page ${img.pageNum}`}
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => downloadSingle(img)}
                        className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-white transition-colors"
                      >
                        <Download size={12} />
                        PNG
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Page {img.pageNum}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(img.blob.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Convert another */}
            <button
              type="button"
              onClick={resetAll}
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Convert another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
