"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Globe,
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
  Play,
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
  XCircle,
} from "lucide-react";
import { uploadPDF, getJobStatus, JobStatus } from "@/lib/api";
import UsageGateModal from "../../components/UsageGateModal";
import { verifyUsageAndGetToken, recordUsageSuccess } from "../../utils/usageClient";

const API_URL = "https://convert-pdf-to-audio.onrender.com";

const SUPPORTED_LANGUAGES = [
  { code: "es", name: "Spanish",    flag: "🇪🇸", region: "Spain, Latin America, USA" },
  { code: "fr", name: "French",     flag: "🇫🇷", region: "France, Canada, Africa" },
  { code: "de", name: "German",     flag: "🇩🇪", region: "Germany, Austria, Switzerland" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", region: "Brazil, Portugal" },
  { code: "it", name: "Italian",    flag: "🇮🇹", region: "Italy" },
  { code: "nl", name: "Dutch",      flag: "🇳🇱", region: "Netherlands" },
  { code: "ja", name: "Japanese",   flag: "🇯🇵", region: "Japan" },
  { code: "en", name: "English",    flag: "🇬🇧", region: "Worldwide" },
];

const STATUS_LABELS: Record<string, string> = {
  pending:          "Queued...",
  extracting:       "Extracting text...",
  translating:      "Translating...",
  generating_audio: "Generating audio...",
  completed:        "Done!",
  failed:           "Failed",
};

export default function PdfToAudioPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Kavindu");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    const savedName = localStorage.getItem("user_profile_name");
    if (savedName) setUserName(savedName);
  }, []);

  const [file, setFile]               = useState<File | null>(null);
  const [targetLang, setTargetLang]   = useState("es");
  const [voiceGender, setVoiceGender] = useState("neutral");
  const [langOpen, setLangOpen]       = useState(false);

  const [jobId, setJobId]           = useState<string | null>(null);
  const [jobStatus, setJobStatus]   = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [isFreePlan, setIsFreePlan] = useState(true);

  // Secure job token tracking states
  const [activeJobToken, setActiveJobToken] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activePageCount, setActivePageCount] = useState<number>(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);

          if (status.status === "completed" && activeJobToken && activeJobId) {
            await recordUsageSuccess({
              jobToken: activeJobToken,
              jobId: activeJobId,
              toolSlug: "pdf-to-audio",
              fileSizeMb: file ? file.size / (1024 * 1024) : 0,
              pageCount: activePageCount,
              fileCount: 1,
            });
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, activeJobToken, activeJobId, activePageCount, file]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
      setJobId(null);
      setJobStatus(null);
      setEstimatedTime(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      setError(err?.code === "file-too-large" ? "File too large (max 50 MB)." : "Only PDF files accepted.");
    },
  });

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdf.getPageCount();
      const fileSizeMb = file.size / (1024 * 1024);

      // Perform server-side access check & token creation
      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "pdf-to-audio",
        toolName: "PDF to Audio",
        fileSizeMb,
        pageCount,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsUploading(false);
        return;
      }

      setActiveJobToken(checkResult.jobToken || null);
      setActiveJobId(checkResult.jobId || null);
      setActivePageCount(pageCount);

      const res = await uploadPDF(file, targetLang, "auto", voiceGender);
      setJobId(res.job_id);
      setEstimatedTime(res.estimated_time ? String(res.estimated_time) : null);
      setIsFreePlan(res.is_free_plan ?? true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "Upload failed. Please try again.";
      if (detail.includes("Free plan limit reached") || detail.includes("3 free conversions")) {
        setError("__upgrade__");
      } else {
        setError(detail);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const selectedLang  = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
  const isProcessing  = jobStatus && !["completed", "failed"].includes(jobStatus.status);
  const isDone        = jobStatus?.status === "completed";
  const isFailed      = jobStatus?.status === "failed";

  const getAudioUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
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
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Convert PDF to Audiobook</h1>
          <p className="text-slate-500">Upload a PDF, choose your language, and get an audio file.</p>
        </div>

        {/* Free Plan Banner */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <Lock size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Free Plan — Limited Preview</p>
            <p className="text-amber-400/70 text-xs mt-1">
              First <strong>3 non-blank pages</strong> only · Maximum <strong>3 conversions</strong> total.
              Upgrade for full book conversion.
            </p>
          </div>
          <button className="ml-auto shrink-0 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors">
            Upgrade
          </button>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-700 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragActive ? "border-indigo-400 bg-indigo-500/10" : "border-slate-300 hover:border-white/40 hover:bg-slate-50 border border-slate-200"}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-indigo-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-medium">Drop your PDF here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse · max 50 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Step 2: Language & Voice */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-700 text-xs flex items-center justify-center">2</span>
            Choose Language & Voice
          </h2>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 hover:border-white/30 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Globe size={16} className="text-slate-500" />
                {selectedLang && (
                  <>
                    <span className="text-xl">{selectedLang.flag}</span>
                    <span className="font-medium">{selectedLang.name}</span>
                    <span className="text-sm text-slate-400">{selectedLang.region}</span>
                  </>
                )}
              </span>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-xl bg-gray-900 border border-slate-200 shadow-2xl overflow-hidden">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => { setTargetLang(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border border-slate-200 transition-colors
                      ${targetLang === lang.code ? "bg-indigo-500/10 text-indigo-600" : "text-slate-600"}`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-sm text-slate-400 ml-auto">{lang.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {["neutral", "female", "male"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setVoiceGender(g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize
                  ${voiceGender === g
                    ? "bg-indigo-500 border-indigo-400 text-slate-900"
                    : "bg-slate-50 border border-slate-200 border-slate-200 text-slate-500 hover:border-white/30"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Upgrade Error */}
        {error === "__upgrade__" && (
          <div className="rounded-2xl border border-red-200 bg-red-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle size={18} />
              <span className="font-semibold">Free limit reached</span>
            </div>
            <p className="text-sm text-slate-500">
              You have used all <strong>3 free conversions</strong>. Upgrade to convert full books with no limits.
            </p>
            <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors">
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Regular Error */}
        {error && error !== "__upgrade__" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <XCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit */}
        {!jobId && error !== "__upgrade__" && (
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-semibold text-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <><Loader2 size={20} className="animate-spin" /> Uploading...</>
            ) : (
              <><Play size={20} fill="white" /> Convert to Audiobook</>
            )}
          </button>
        )}

        {/* Estimated Time */}
        {estimatedTime && isProcessing && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl border border-slate-200">
            <Clock size={15} className="text-indigo-600" />
            Estimated time: <span className="text-slate-900 font-medium">{estimatedTime}</span>
          </div>
        )}

        {/* Progress & Results */}
        {jobStatus && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDone      && <CheckCircle2 size={20} className="text-green-700" />}
                {isFailed    && <XCircle size={20} className="text-red-800" />}
                {isProcessing && <Loader2 size={20} className="animate-spin text-indigo-600" />}
                <span className="font-medium">{STATUS_LABELS[jobStatus.status] || jobStatus.status}</span>
              </div>
              <span className="text-sm text-slate-500">{jobStatus.progress_percent}%</span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700 progress-glow"
                style={{ width: `${jobStatus.progress_percent}%` }}
              />
            </div>

            {/* Page count info */}
            {jobStatus.total_pages > 0 && (
              <p className="text-xs text-slate-400">
                Processing {jobStatus.processed_pages} of {jobStatus.total_pages} pages
                {jobStatus.total_pages > 3 && (
                  <span className="text-amber-400 ml-2">· Free plan: first 3 pages only</span>
                )}
              </p>
            )}

            {jobStatus.is_scanned_pdf && (
              <p className="text-xs text-amber-400">⚠ Scanned PDF detected — using OCR for text extraction.</p>
            )}

            {isFailed && jobStatus.error_message && (
              <p className="text-sm text-red-800">{jobStatus.error_message}</p>
            )}

            {/* Audio Results */}
            {isDone && jobStatus.chapter_urls && jobStatus.chapter_urls.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-slate-500">
                  {jobStatus.chapter_urls.length} chapter{jobStatus.chapter_urls.length > 1 ? "s" : ""} ready
                  — {jobStatus.target_language_name}
                </p>
                {jobStatus.chapter_urls.map((url, i) => {
                  const fullUrl = getAudioUrl(url);
                  return (
                    <div key={url} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200">
                      <span className="text-sm text-slate-600 w-20">Chapter {i + 1}</span>
                      <audio controls src={fullUrl} className="flex-1 mx-3 h-8" />
                      <a
                        href={fullUrl}
                        download={`chapter-${i + 1}.mp3`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm transition-colors whitespace-nowrap"
                      >
                        <Download size={14} />
                        MP3
                      </a>
                    </div>
                  );
                })}

                {/* Upgrade prompt after completion */}
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-500/5">
                  <p className="text-sm text-indigo-700 font-medium">Want the full book?</p>
                  <p className="text-xs text-slate-400 mt-1">Upgrade to convert up to 500 pages per PDF.</p>
                  <button className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors">
                    Upgrade to Pro
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setFile(null); setJobId(null); setJobStatus(null); setError(null); setEstimatedTime(null); }}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
                >
                  Convert another PDF
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/60 py-4 px-6 relative z-10 bg-slate-50 text-slate-500 shadow-inner mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact Us</Link>
          </div>
        </div>
      </footer>

      {/* Usage Gate Modal */}
      <UsageGateModal />
    </div>
  );
}
