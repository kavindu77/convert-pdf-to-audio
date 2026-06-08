"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileImage,
  Upload,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  Image,
} from "lucide-react";

interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
}

type PageSize = "fit" | "a4";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function convertWebPToPng(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("Could not get canvas context"));
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
        },
        "image/png"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export default function ImagesToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback((files: File[]) => {
    const accepted = files.filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (accepted.length === 0) return;

    const newImages: ImageFile[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    setIsDone(false);
    setError(null);
    setResultSize(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      addImages(files);
    },
    [addImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addImages(Array.from(e.target.files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addImages]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setIsDone(false);
    setError(null);
  }, []);

  const moveImage = useCallback((index: number, direction: "up" | "down") => {
    setImages((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }, []);

  const handleCreatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setIsDone(false);
    setResultSize(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;

      for (let i = 0; i < images.length; i++) {
        const imgFile = images[i];
        setProgress(Math.round(((i + 0.5) / images.length) * 100));

        let imgBytes: ArrayBuffer | Uint8Array;
        let embedFn: "embedPng" | "embedJpg";

        if (imgFile.file.type === "image/webp") {
          imgBytes = await convertWebPToPng(imgFile.file);
          embedFn = "embedPng";
        } else if (imgFile.file.type === "image/png") {
          imgBytes = await imgFile.file.arrayBuffer();
          embedFn = "embedPng";
        } else {
          imgBytes = await imgFile.file.arrayBuffer();
          embedFn = "embedJpg";
        }

        const img = await pdfDoc[embedFn](imgBytes);
        const imgWidth = img.width;
        const imgHeight = img.height;

        if (pageSize === "fit") {
          const page = pdfDoc.addPage([imgWidth, imgHeight]);
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
          });
        } else {
          const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          const scale = Math.min(
            A4_WIDTH / imgWidth,
            A4_HEIGHT / imgHeight
          );
          const scaledW = imgWidth * scale;
          const scaledH = imgHeight * scale;
          const x = (A4_WIDTH - scaledW) / 2;
          const y = (A4_HEIGHT - scaledH) / 2;
          page.drawImage(img, {
            x,
            y,
            width: scaledW,
            height: scaledH,
          });
        }

        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      setResultSize(pdfBytes.length);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "images.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsDone(true);
    } catch (err: unknown) {
      console.error("PDF creation failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create PDF. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setIsDone(false);
    setError(null);
    setProgress(0);
    setResultSize(null);
  };

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
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileImage size={32} className="text-emerald-400" />
            Images to PDF
          </h1>
          <p className="text-gray-400">
            Combine multiple images into a single PDF document. Supports JPEG,
            PNG, and WebP — all processing happens in your browser.
          </p>
        </div>

        {/* Step 1: Upload Images */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload Images
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${
                isDragOver
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload size={32} className="mx-auto mb-3 text-gray-500" />
            <p className="text-gray-300 font-medium">
              Drop your images here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse · JPEG, PNG, WebP
            </p>
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm text-gray-400">
                {images.length} image{images.length !== 1 ? "s" : ""} selected
              </p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {img.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(img.size)}
                      </p>
                    </div>

                    {/* Reorder + Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(index, "up");
                        }}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(index, "down");
                        }}
                        disabled={index === images.length - 1}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Page Settings */}
        {images.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-center">
                2
              </span>
              Page Settings
            </h2>

            <div className="flex gap-3">
              {(
                [
                  { value: "fit", label: "Fit to Image" },
                  { value: "a4", label: "A4" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPageSize(opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all
                    ${
                      pageSize === opt.value
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              {pageSize === "fit"
                ? "Each page will match the image dimensions exactly."
                : "Images will be centered on A4 pages (210 × 297 mm), scaled to fit."}
            </p>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <X size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Create PDF Button */}
        {images.length > 0 && !isDone && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCreatePdf}
            className="w-full py-4 rounded-2xl font-semibold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating PDF... {progress}%
              </>
            ) : (
              <>
                <Image size={20} />
                Create PDF
              </>
            )}
          </button>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Processing image {Math.min(Math.ceil((progress / 100) * images.length), images.length)} of{" "}
              {images.length}
            </p>
          </div>
        )}

        {/* Result */}
        {isDone && (
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <div>
                <p className="font-semibold text-white">PDF Created Successfully!</p>
                <p className="text-sm text-gray-400">
                  {images.length} image{images.length !== 1 ? "s" : ""} combined
                  {resultSize && ` · ${formatFileSize(resultSize)}`}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Your PDF has been downloaded as{" "}
              <span className="text-emerald-300 font-medium">images.pdf</span>
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreatePdf}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download Again
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
              >
                Start Over
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
