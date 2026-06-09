"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileEdit,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface DetectedField {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio" | "unknown";
  options?: string[];
  currentValue?: string | boolean;
}

export default function FormFillerPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large for client-side form filling (max 50 MB).");
      return;
    }
    setFile(f);
    setError(null);
    setFields([]);
    setPdfBytes(null);
    setResultBlob(null);
  }, []);

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

  const handleParseForm = async () => {
    if (!file) return;

    setIsParsing(true);
    setError(null);
    setProgress(20);
    setProgressLabel("Reading PDF file bytes...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(arrayBuffer);
      setProgress(50);
      setProgressLabel("Loading PDF Document...");

      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setProgress(75);
      setProgressLabel("Checking for interactive form fields...");

      const form = pdfDoc.getForm();
      const rawFields = form.getFields();

      if (rawFields.length === 0) {
        throw new Error("No fillable PDF Form fields detected in this document.");
      }

      const parsedFields: DetectedField[] = [];
      for (const field of rawFields) {
        const name = field.getName();
        const typeStr = field.constructor.name;

        let type: DetectedField["type"] = "unknown";
        let options: string[] = [];
        let currentValue: string | boolean = "";

        if (typeStr === "PDFTextField") {
          type = "text";
          try {
            currentValue = (field as any).getText() || "";
          } catch {}
        } else if (typeStr === "PDFCheckBox") {
          type = "checkbox";
          try {
            currentValue = (field as any).isChecked();
          } catch {}
        } else if (typeStr === "PDFDropdown") {
          type = "dropdown";
          try {
            options = (field as any).getOptions();
            currentValue = (field as any).getSelected()[0] || "";
          } catch {}
        } else if (typeStr === "PDFRadioGroup") {
          type = "radio";
          try {
            options = (field as any).getOptions();
            currentValue = (field as any).getSelected() || "";
          } catch {}
        }

        parsedFields.push({
          name,
          type,
          options,
          currentValue,
        });
      }

      setFields(parsedFields);
      setProgress(100);
      setProgressLabel("Form loaded!");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while parsing the form.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleValueChange = (name: string, val: string | boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.name === name ? { ...f, currentValue: val } : f))
    );
  };

  const handleFillForm = async () => {
    if (!pdfBytes || !file) return;

    setIsFilling(true);
    setError(null);
    setProgress(30);
    setProgressLabel("Initializing PDF form writer...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();

      setProgress(60);
      setProgressLabel("Writing updated form values...");

      for (const fieldData of fields) {
        const field = form.getField(fieldData.name);
        
        if (fieldData.type === "text" && typeof fieldData.currentValue === "string") {
          (field as any).setText(fieldData.currentValue);
        } else if (fieldData.type === "checkbox" && typeof fieldData.currentValue === "boolean") {
          if (fieldData.currentValue) {
            (field as any).check();
          } else {
            (field as any).uncheck();
          }
        } else if (fieldData.type === "dropdown" && typeof fieldData.currentValue === "string") {
          (field as any).select(fieldData.currentValue);
        } else if (fieldData.type === "radio" && typeof fieldData.currentValue === "string") {
          (field as any).select(fieldData.currentValue);
        }
      }

      setProgress(85);
      setProgressLabel("Generating final PDF file...");

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([modifiedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      
      setResultBlob(blob);
      setProgress(100);
      setProgressLabel("Complete!");
    } catch (err: any) {
      setError(`Failed to save filled form: ${err.message || err}`);
    } finally {
      setIsFilling(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}-filled.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setFields([]);
    setPdfBytes(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    if (inputRef.current) inputRef.current.value = "";
  };

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
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
              <FileEdit size={20} className="text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF Form Filler</h1>
          </div>
          <p className="text-gray-400">
            Parse interactive form fields within any PDF document and fill them out instantly in your browser.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF Form
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              file ? "border-violet-500/30 bg-violet-500/5" : "border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-violet-400" />
                  <div className="text-left">
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">Drop fillable PDF here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse · max 50 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 2: Parse Button */}
        {file && fields.length === 0 && !error && (
          <button
            onClick={handleParseForm}
            disabled={isParsing}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 animate-pulse"
            style={{ backgroundColor: "#8b5cf6" }}
          >
            {isParsing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {progressLabel} ({progress}%)
              </>
            ) : (
              <>
                <FileEdit size={20} />
                Load PDF Form Fields
              </>
            )}
          </button>
        )}

        {/* Step 3: Interactive Fields Form */}
        {fields.length > 0 && !resultBlob && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs flex items-center justify-center">
                2
              </span>
              Form Fields detected ({fields.length})
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <span className="text-xs font-semibold text-gray-400 select-none truncate">
                    {field.name}
                  </span>

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={(field.currentValue as string) || ""}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    />
                  )}

                  {field.type === "checkbox" && (
                    <label className="flex items-center gap-2.5 cursor-pointer py-1 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={!!field.currentValue}
                        onChange={(e) => handleValueChange(field.name, e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 accent-violet-500 cursor-pointer"
                      />
                      Check / Select
                    </label>
                  )}

                  {field.type === "dropdown" && (
                    <select
                      value={(field.currentValue as string) || ""}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      className="bg-gray-900 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-gray-950 text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "radio" && (
                    <div className="flex flex-wrap gap-3 py-1">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                          <input
                            type="radio"
                            name={field.name}
                            value={opt}
                            checked={field.currentValue === opt}
                            onChange={(e) => handleValueChange(field.name, e.target.value)}
                            className="w-4 h-4 accent-violet-500 cursor-pointer"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {field.type === "unknown" && (
                    <span className="text-xs text-gray-500 italic">Unsupported field type</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleFillForm}
              disabled={isFilling}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#8b5cf6" }}
            >
              {isFilling ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating filled PDF...
                </>
              ) : (
                "Save & Finish PDF"
              )}
            </button>
          </section>
        )}

        {/* Step 4: Results */}
        {resultBlob && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs flex items-center justify-center">
                3
              </span>
              Complete
            </h2>

            <div className="flex items-center gap-2.5 text-green-400">
              <CheckCircle2 size={22} />
              <span className="font-semibold">Interactive PDF Form filled successfully!</span>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#8b5cf6" }}
            >
              <Download size={20} />
              Download Filled PDF
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white transition-all text-xs"
            >
              Fill out another PDF Form
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
