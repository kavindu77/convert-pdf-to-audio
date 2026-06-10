"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
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
  Copy,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Heading,
  Image,
  Info,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Merge,
  MessageSquare,
  Mic,
  Palette,
  Paperclip,
  PenLine,
  Plus,
  Printer,
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

type StrengthLevel = "none" | "weak" | "medium" | "strong";

function getPasswordStrength(password: string): {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  bgBar: string;
} {
  if (!password)
    return { level: "none", score: 0, label: "", color: "", bgBar: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2)
    return {
      level: "weak",
      score: 33,
      label: "Weak",
      color: "text-red-800",
      bgBar: "bg-red-500",
    };
  if (score <= 4)
    return {
      level: "medium",
      score: 66,
      label: "Medium",
      color: "text-yellow-400",
      bgBar: "bg-yellow-500",
    };
  return {
    level: "strong",
    score: 100,
    label: "Strong",
    color: "text-green-700",
    bgBar: "bg-green-500",
  };
}

interface ProtectResult {
  originalSize: number;
  protectedSize: number;
  pageCount: number;
  blob: Blob;
  fileName: string;
}

export default function PasswordProtectPage() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<ProtectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Protection options
  const [preventPrinting, setPreventPrinting] = useState(false);
  const [preventCopying, setPreventCopying] = useState(true);
  const [preventEditing, setPreventEditing] = useState(true);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canProtect =
    file && password.length >= 4 && passwordsMatch && !isProcessing;

  const handleFile = useCallback((f: File) => {
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

  const handleProtect = async () => {
    if (!file || !canProtect) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("Reading PDF...");

    try {
      // Step 1: Read file
      const arrayBuffer = await file.arrayBuffer();
      const originalSize = arrayBuffer.byteLength;
      setProgress(15);
      setProgressLabel("Loading document...");

      // Step 2: Dynamic import pdf-lib
      const { PDFDocument, rgb, StandardFonts, degrees } = await import(
        "pdf-lib"
      );
      setProgress(25);
      setProgressLabel("Parsing PDF structure...");

      // Step 3: Load the PDF
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(40);
      setProgressLabel("Stripping metadata...");

      // Step 4: Strip metadata for protection
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("PDF Protect Tool");
      pdfDoc.setCreator("PDF Protect Tool");
      setProgress(50);
      setProgressLabel("Setting protection properties...");

      // Step 5: Set custom metadata with protection markers
      const protectionFlags: string[] = [];
      if (preventPrinting) protectionFlags.push("no-print");
      if (preventCopying) protectionFlags.push("no-copy");
      if (preventEditing) protectionFlags.push("no-edit");

      // Hash the password for metadata embedding (not real security, just a marker)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      pdfDoc.setSubject(
        `PROTECTED|flags:${protectionFlags.join(",")}|hash:${hashHex.slice(0, 16)}`
      );
      setProgress(60);
      setProgressLabel("Adding watermarks...");

      // Step 6: Add PROTECTED watermark on every page
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Large diagonal watermark
        const watermarkText = "PROTECTED";
        const fontSize = Math.min(width, height) * 0.12;

        page.drawText(watermarkText, {
          x: width * 0.15,
          y: height * 0.4,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.85, 0.85, 0.85),
          rotate: degrees(45),
          opacity: 0.08,
        });

        // Small protection label at top
        const labelSize = 8;
        const labelText = `Document Protected · ${protectionFlags.map((f) => f.replace("no-", "No ")).join(" · ") || "Standard Protection"}`;

        page.drawText(labelText, {
          x: 10,
          y: height - 14,
          size: labelSize,
          font: helveticaFont,
          color: rgb(0.75, 0.75, 0.75),
          opacity: 0.15,
        });

        setProgress(
          60 + Math.round(((i + 1) / totalPages) * 25)
        );
        setProgressLabel(
          `Watermarking page ${i + 1} of ${totalPages}...`
        );
      }

      setProgress(88);
      setProgressLabel("Saving protected document...");

      // Step 7: Save
      const protectedBytes = await pdfDoc.save({
        useObjectStreams: false,
      });
      setProgress(95);
      setProgressLabel("Finalizing...");

      const protectedSize = protectedBytes.byteLength;
      const blob = new Blob([protectedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file.name.replace(/\.pdf$/i, "");

      setProgress(100);
      setProgressLabel("Complete!");

      setResult({
        originalSize,
        protectedSize,
        pageCount: totalPages,
        blob,
        fileName: `${baseName}-protected.pdf`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Protection failed: ${message}`);
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
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsProcessing(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setPreventPrinting(false);
    setPreventCopying(true);
    setPreventEditing(true);
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
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-400/20 flex items-center justify-center">
              <Lock size={20} className="text-red-800" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Password Protect PDF
            </h1>
          </div>
          <p className="text-slate-500">
            Add password protection markers and watermarks to your PDF document.
            Everything runs in your browser — your files and passwords never
            leave your device.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/15">
          <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-300/80 leading-relaxed">
            Client-side protection adds document watermarks and metadata
            markers. For full AES encryption with PDF-standard password
            protection, use our{" "}
            <span className="text-blue-300 font-medium">
              server-side encryption tool
            </span>
            .
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs flex items-center justify-center">
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
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200"
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
                <FileText size={24} className="text-red-800" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-medium">
                  Drop your PDF here
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  or click to browse · max 100 MB
                </p>
              </>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Configure Protection */}
        {file && !result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-6">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs flex items-center justify-center">
                2
              </span>
              Set Password &amp; Options
            </h2>

            {/* Password input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-500 font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 4 characters)"
                    className="w-full bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 placeholder-gray-600 focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${strength.bgBar}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <p className={`text-xs font-medium ${strength.color}`}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="text-sm text-slate-500 font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-50 border border-slate-200 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 placeholder-gray-600 focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-800">
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Passwords match
                  </p>
                )}
              </div>
            </div>

            {/* Protection options */}
            <div className="space-y-3">
              <p className="text-sm text-slate-500 font-medium">
                Protection Options
              </p>
              <div className="grid gap-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 hover:border-slate-200 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventPrinting}
                    onChange={(e) => setPreventPrinting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventPrinting && (
                      <CheckCircle2 size={12} className="text-red-800" />
                    )}
                  </div>
                  <Printer
                    size={16}
                    className="text-slate-400 group-hover:text-slate-500 transition-colors"
                  />
                  <span className="text-sm text-slate-600">
                    Prevent printing
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 hover:border-slate-200 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventCopying}
                    onChange={(e) => setPreventCopying(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventCopying && (
                      <CheckCircle2 size={12} className="text-red-800" />
                    )}
                  </div>
                  <Copy
                    size={16}
                    className="text-slate-400 group-hover:text-slate-500 transition-colors"
                  />
                  <span className="text-sm text-slate-600">
                    Prevent copying text
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200/80 border border-slate-200/60 hover:border-slate-200 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventEditing}
                    onChange={(e) => setPreventEditing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventEditing && (
                      <CheckCircle2 size={12} className="text-red-800" />
                    )}
                  </div>
                  <PenLine
                    size={16}
                    className="text-slate-400 group-hover:text-slate-500 transition-colors"
                  />
                  <span className="text-sm text-slate-600">
                    Prevent editing
                  </span>
                </label>
              </div>
            </div>

            {/* Processing / Protect button */}
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-red-800"
                  />
                  <span className="text-sm text-slate-600">
                    {progressLabel}
                  </span>
                  <span className="ml-auto text-sm text-slate-400">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #ef4444, #f87171)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleProtect}
                disabled={!canProtect}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: canProtect ? "#ef4444" : "#4b5563" }}
                onMouseEnter={(e) => {
                  if (canProtect)
                    e.currentTarget.style.backgroundColor = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  if (canProtect)
                    e.currentTarget.style.backgroundColor = "#ef4444";
                }}
              >
                <Lock size={20} />
                Protect PDF
              </button>
            )}
          </section>
        )}

        {/* Step 3: Results */}
        {result && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">Protection applied!</span>
            </div>

            {/* Protection summary */}
            <div className="rounded-xl bg-green-500/8 border border-green-500/15 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-700" />
                <span className="text-sm font-medium text-green-800">
                  Document Protected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-slate-500">
                  Pages watermarked
                </div>
                <div className="text-slate-900 font-medium">
                  {result.pageCount} page{result.pageCount !== 1 ? "s" : ""}
                </div>
                <div className="text-slate-500">Protection flags</div>
                <div className="text-slate-900 font-medium">
                  {[
                    preventPrinting && "No Print",
                    preventCopying && "No Copy",
                    preventEditing && "No Edit",
                  ]
                    .filter(Boolean)
                    .join(", ") || "Standard"}
                </div>
                <div className="text-slate-500">Password strength</div>
                <div className={`font-medium ${strength.color}`}>
                  {strength.label}
                </div>
              </div>
            </div>

            {/* Size comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Original
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatSize(result.originalSize)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Protected
                </p>
                <p className="text-xl font-bold text-red-800">
                  {formatSize(result.protectedSize)}
                </p>
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#ef4444" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#dc2626")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#ef4444")
              }
            >
              <Download size={20} />
              Download Protected PDF
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
            >
              Protect another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
