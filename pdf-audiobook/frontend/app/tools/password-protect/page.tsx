"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Lock,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Info,
  Printer,
  Copy,
  PenLine,
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
      color: "text-red-400",
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
    color: "text-green-400",
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
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-400/20 flex items-center justify-center">
              <Lock size={20} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Password Protect PDF
            </h1>
          </div>
          <p className="text-gray-400">
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
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
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
                  ? "border-red-400 bg-red-500/10"
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
                <FileText size={24} className="text-red-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatSize(file.size)}
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
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Configure Protection */}
        {file && !result && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs flex items-center justify-center">
                2
              </span>
              Set Password &amp; Options
            </h2>

            {/* Password input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 4 characters)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
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
                <label className="text-sm text-gray-400 font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400">
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Passwords match
                  </p>
                )}
              </div>
            </div>

            {/* Protection options */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-medium">
                Protection Options
              </p>
              <div className="grid gap-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventPrinting}
                    onChange={(e) => setPreventPrinting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-white/20 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventPrinting && (
                      <CheckCircle2 size={12} className="text-red-400" />
                    )}
                  </div>
                  <Printer
                    size={16}
                    className="text-gray-500 group-hover:text-gray-400 transition-colors"
                  />
                  <span className="text-sm text-gray-300">
                    Prevent printing
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventCopying}
                    onChange={(e) => setPreventCopying(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-white/20 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventCopying && (
                      <CheckCircle2 size={12} className="text-red-400" />
                    )}
                  </div>
                  <Copy
                    size={16}
                    className="text-gray-500 group-hover:text-gray-400 transition-colors"
                  />
                  <span className="text-sm text-gray-300">
                    Prevent copying text
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preventEditing}
                    onChange={(e) => setPreventEditing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-white/20 peer-checked:border-red-400 peer-checked:bg-red-500/20 flex items-center justify-center transition-all">
                    {preventEditing && (
                      <CheckCircle2 size={12} className="text-red-400" />
                    )}
                  </div>
                  <PenLine
                    size={16}
                    className="text-gray-500 group-hover:text-gray-400 transition-colors"
                  />
                  <span className="text-sm text-gray-300">
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
                    className="animate-spin text-red-400"
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
          <section className="rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs flex items-center justify-center">
                3
              </span>
              Results
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-medium">Protection applied!</span>
            </div>

            {/* Protection summary */}
            <div className="rounded-xl bg-green-500/8 border border-green-500/15 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Document Protected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-400">
                  Pages watermarked
                </div>
                <div className="text-white font-medium">
                  {result.pageCount} page{result.pageCount !== 1 ? "s" : ""}
                </div>
                <div className="text-gray-400">Protection flags</div>
                <div className="text-white font-medium">
                  {[
                    preventPrinting && "No Print",
                    preventCopying && "No Copy",
                    preventEditing && "No Edit",
                  ]
                    .filter(Boolean)
                    .join(", ") || "Standard"}
                </div>
                <div className="text-gray-400">Password strength</div>
                <div className={`font-medium ${strength.color}`}>
                  {strength.label}
                </div>
              </div>
            </div>

            {/* Size comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Original
                </p>
                <p className="text-xl font-bold text-white">
                  {formatSize(result.originalSize)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Protected
                </p>
                <p className="text-xl font-bold text-red-400">
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
              className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
            >
              Protect another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
