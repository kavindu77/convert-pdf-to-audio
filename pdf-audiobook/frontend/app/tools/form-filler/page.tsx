"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileEdit,
  FileImage,
  FileText,
  Heading,
  Image,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Merge,
  MessageSquare,
  Mic,
  Palette,
  Paperclip,
  Plus,
  RotateCw,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  X,
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Header */}
            <header className="sticky top-0 relative border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-750 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={16} className="text-slate-900" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/tools/merge" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Compress PDF</Link>
            
            {/* Mega menu link dropdown style */}
            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                Convert PDF <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 flex flex-col gap-1 text-left">
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mb-1">Convert to PDF</div>
                <Link href="/tools/images-to-pdf" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileImage size={13} className="text-green-500 shrink-0" /> Images to PDF</Link>
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mt-2 mb-1">Convert from PDF</div>
                <Link href="/tools/pdf-to-images" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Image size={13} className="text-amber-500 shrink-0" /> PDF to Images</Link>
                <Link href="/tools/extract-text" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileText size={13} className="text-orange-500 shrink-0" /> Extract Text</Link>
                <Link href="/tools/pdf-to-audio" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Mic size={13} className="text-indigo-500 shrink-0" /> PDF to Audio</Link>
              </div>
            </div>

            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                All PDF Tools <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-[240px] mt-1 w-[720px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 grid grid-cols-4 gap-4 text-left">
                {/* Organize */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Organize PDF</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/merge" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Merge size={12} className="text-[#8b5cf6]" /> Merge PDF</Link>
                    <Link href="/tools/split" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Scissors size={12} className="text-[#ec4899]" /> Split PDF</Link>
                    <Link href="/tools/compress" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Archive size={12} className="text-[#06b6d4]" /> Compress PDF</Link>
                    <Link href="/tools/rotate" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><RotateCw size={12} className="text-[#a855f7]" /> Rotate PDF</Link>
                  </div>
                </div>
                {/* Security */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Security &amp; Privacy</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/privacy-report" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Eye size={12} className="text-[#14b8a6]" /> Privacy Report</Link>
                    <Link href="/tools/evidence-locker" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#3b82f6]" /> Evidence Locker</Link>
                    <Link href="/tools/fake-redaction" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><AlertOctagon size={12} className="text-[#ef4444]" /> Fake Redaction</Link>
                    <Link href="/tools/attachments" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Paperclip size={12} className="text-[#6366f1]" /> Attachments</Link>
                    <Link href="/tools/password-protect" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Lock size={12} className="text-[#ef4444]" /> Protect PDF</Link>
                  </div>
                </div>
                {/* Print */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Print &amp; Scan</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/color-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Palette size={12} className="text-[#10b981]" /> Color Detector</Link>
                    <Link href="/tools/ink-saver" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sun size={12} className="text-[#eab308]" /> Ink Saver</Link>
                    <Link href="/tools/bad-scan-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ScanLine size={12} className="text-[#ec4899]" /> Bad Scan</Link>
                    <Link href="/tools/watermark" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Droplets size={12} className="text-[#0ea5e9]" /> Watermark</Link>
                  </div>
                </div>
                {/* AI */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">AI &amp; Business</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/pdf-chat" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><MessageSquare size={12} className="text-[#818cf8]" /> PDF Q&amp;A Chat</Link>
                    <Link href="/tools/summarize" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sparkles size={12} className="text-[#d946ef]" /> Summarizer</Link>
                    <Link href="/tools/flashcards" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Layers size={12} className="text-[#10b981]" /> Flashcards</Link>
                    <Link href="/tools/pdf-to-audio" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Mic size={12} className="text-[#6366f1]" /> PDF to Audio</Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-slate-700 font-bold">{userName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
              <FileEdit size={20} className="text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">PDF Form Filler</h1>
          </div>
          <p className="text-slate-500">
            Parse interactive form fields within any PDF document and fill them out instantly in your browser.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
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
              file ? "border-violet-500/30 bg-violet-500/5" : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200 cursor-pointer"
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
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-medium">Drop fillable PDF here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse · max 50 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
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
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs flex items-center justify-center">
                2
              </span>
              Form Fields detected ({fields.length})
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 hover:border-slate-300 transition-all">
                  <span className="text-xs font-semibold text-slate-500 select-none truncate">
                    {field.name}
                  </span>

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={(field.currentValue as string) || ""}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500/50"
                    />
                  )}

                  {field.type === "checkbox" && (
                    <label className="flex items-center gap-2.5 cursor-pointer py-1 text-sm text-slate-900">
                      <input
                        type="checkbox"
                        checked={!!field.currentValue}
                        onChange={(e) => handleValueChange(field.name, e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-slate-200 bg-slate-50 border border-slate-200 accent-violet-500 cursor-pointer"
                      />
                      Check / Select
                    </label>
                  )}

                  {field.type === "dropdown" && (
                    <select
                      value={(field.currentValue as string) || ""}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      className="bg-gray-900 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500/50"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-slate-50 text-slate-900">
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "radio" && (
                    <div className="flex flex-wrap gap-3 py-1">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-900 cursor-pointer">
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
                    <span className="text-xs text-slate-400 italic">Unsupported field type</span>
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
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs flex items-center justify-center">
                3
              </span>
              Complete
            </h2>

            <div className="flex items-center gap-2.5 text-green-700">
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
              className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 transition-all text-xs"
            >
              Fill out another PDF Form
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
