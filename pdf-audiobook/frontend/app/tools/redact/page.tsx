"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  Archive,
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Heading,
  Image,
  Key,
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
  Shield,
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

interface RedactionPattern {
  id: string;
  label: string;
  regex: RegExp;
  enabled: boolean;
  matchCount: number;
  builtIn: boolean;
}

const BUILT_IN_PATTERNS: Omit<RedactionPattern, "enabled" | "matchCount">[] = [
  {
    id: "email",
    label: "Email Addresses",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    builtIn: true,
  },
  {
    id: "phone",
    label: "Phone Numbers",
    regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    builtIn: true,
  },
  {
    id: "ssn",
    label: "SSN",
    regex: /\d{3}[-]?\d{2}[-]?\d{4}/g,
    builtIn: true,
  },
  {
    id: "creditcard",
    label: "Credit Card Numbers",
    regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
    builtIn: true,
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text: string, regex: RegExp): number {
  const re = new RegExp(regex.source, regex.flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

// OPTIONAL: Hardcode your Groq API key here (e.g., "gsk_...") to bypass entering it in the browser UI
const HARDCODED_GROQ_API_KEY = "";

export default function RedactPdfPage() {
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
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<RedactionPattern[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [redactedText, setRedactedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Groq API Key state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(true);

  // AI redact settings
  const [useAi, setUseAi] = useState(false);
  const [aiRedactNames, setAiRedactNames] = useState(true);
  const [aiRedactLocations, setAiRedactLocations] = useState(true);
  const [aiRedactOrgs, setAiRedactOrgs] = useState(false);
  const [isAiRedacting, setIsAiRedacting] = useState(false);

  // Load key from hardcoded config or localStorage on mount
  useEffect(() => {
    if (HARDCODED_GROQ_API_KEY) {
      setApiKey(HARDCODED_GROQ_API_KEY);
    } else {
      const saved = localStorage.getItem("groq_api_key");
      if (saved) {
        setApiKey(saved);
      }
    }
  }, []);

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
    setExtractedText(null);
    setRedactedText(null);
    setPatterns([]);
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

  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setExtractedText(null);
    setRedactedText(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = content.items.map((item: any) => item.str).join(" ");
        pageTexts.push(text);
        setProgress({ current: pageNum, total: totalPages });
      }

      const fullText = pageTexts
        .map((text, i) => `--- Page ${i + 1} ---\n${text}`)
        .join("\n\n");

      setExtractedText(fullText);

      // Initialize patterns with match counts
      const initialPatterns: RedactionPattern[] = BUILT_IN_PATTERNS.map((p) => ({
        ...p,
        enabled: false,
        matchCount: countMatches(fullText, p.regex),
      }));
      setPatterns(initialPatterns);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`Text extraction failed: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const togglePattern = (id: string) => {
    setPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    setRedactedText(null);
  };

  const addCustomPattern = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !extractedText) return;

    const id = `custom-${Date.now()}`;
    const regex = new RegExp(escapeRegex(trimmed), "gi");
    const matchCount = countMatches(extractedText, regex);

    setPatterns((prev) => [
      ...prev,
      {
        id,
        label: trimmed.length > 24 ? trimmed.slice(0, 24) + "…" : trimmed,
        regex,
        enabled: true,
        matchCount,
        builtIn: false,
      },
    ]);
    setCustomInput("");
    setRedactedText(null);
  };

  const removeCustomPattern = (id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    setRedactedText(null);
  };

  const enabledPatterns = patterns.filter((p) => p.enabled);
  const totalRedactions = enabledPatterns.reduce(
    (sum, p) => sum + p.matchCount,
    0
  );

  const applyRedaction = async () => {
    if (!extractedText) return;

    setError(null);
    let result = extractedText;

    // Apply standard regex patterns first if any are enabled
    if (enabledPatterns.length > 0) {
      for (const pattern of enabledPatterns) {
        const re = new RegExp(pattern.regex.source, pattern.regex.flags);
        result = result.replace(re, "[REDACTED]");
      }
    }

    if (useAi) {
      if (!apiKey.trim()) {
        setError("Please enter a Groq API Key for AI Redaction.");
        return;
      }

      if (saveKey) {
        localStorage.setItem("groq_api_key", apiKey);
      }

      setIsAiRedacting(true);
      try {
        const targetEntities: string[] = [];
        if (aiRedactNames) targetEntities.push("people's names (first and last names)");
        if (aiRedactLocations) targetEntities.push("locations, physical addresses, cities, and countries");
        if (aiRedactOrgs) targetEntities.push("organization names, corporate names, and institutions");

        if (targetEntities.length === 0) {
          throw new Error("Please select at least one item type for AI to redact.");
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a secure, automated document redaction engine. Redact the following types of information from the provided document:
${targetEntities.map((e) => `- ${e}`).join("\n")}

Rules:
- Replace every occurrence of these identified entities exactly with the word "[REDACTED]".
- Do not modify or redact any other text, numbers, or structure.
- Keep the capitalization, spacing, and phrasing of the rest of the text exactly the same.
- Return ONLY the fully redacted text. Do not add any greeting, intro, explanation, markdown formatting, or notes.`
              },
              {
                role: "user",
                content: result.slice(0, 10000)
              }
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Groq API responded with status ${response.status}`);
        }

        const data = await response.json();
        const aiResult = data.choices?.[0]?.message?.content;

        if (!aiResult) {
          throw new Error("No redacted text returned from the model.");
        }

        setRedactedText(aiResult);
      } catch (err: any) {
        setError(`AI Redaction failed: ${err.message || err}`);
      } finally {
        setIsAiRedacting(false);
      }
    } else {
      setRedactedText(result);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText(null);
    setRedactedText(null);
    setPatterns([]);
    setCustomInput("");
    setError(null);
    setIsExtracting(false);
    setIsAiRedacting(false);
    setProgress({ current: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  const renderHighlightedText = (text: string) => {
    const parts = text.split("[REDACTED]");
    const elements: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      if (i > 0) {
        elements.push(
          <span
            key={`redacted-${i}`}
            className="bg-red-600/80 text-slate-900 px-1.5 py-0.5 rounded text-xs font-bold tracking-wide"
          >
            [REDACTED]
          </span>
        );
      }
      if (part) {
        elements.push(<span key={`text-${i}`}>{part}</span>);
      }
    });

    return elements;
  };

  const handleDownload = () => {
    if (!redactedText) return;
    const blob = new Blob([redactedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file?.name?.replace(/\.pdf$/i, "") || "redacted";
    a.download = `${baseName}-redacted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

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
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/20 flex items-center justify-center">
              <EyeOff size={20} className="text-rose-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">PDF Redactor</h1>
          </div>
          <p className="text-slate-500">
            Automatically detect and redact sensitive information from PDFs.
            Find emails, phone numbers, SSNs, credit cards, or custom text —
            everything runs in your browser.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
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
                  ? "border-rose-400 bg-rose-500/10"
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
                <FileText size={24} className="text-rose-400" />
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

        {/* Step 2: Extract Text */}
        {file && !extractedText && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
                2
              </span>
              Extract Text
            </h2>

            {isExtracting ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2
                      size={18}
                      className="animate-spin text-rose-400"
                    />
                    <span className="text-sm text-slate-600">
                      Extracting page {progress.current} of {progress.total}...
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercent}%`,
                      background: "linear-gradient(90deg, #f43f5e, #fb7185)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#f43f5e" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e11d48")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f43f5e")
                }
              >
                <FileText size={20} />
                Extract Text from PDF
              </button>
            )}
          </section>
        )}

        {/* Step 3: Configure Redaction */}
        {extractedText && !redactedText && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center justify-center">
                3
              </span>
              Configure Redaction
            </h2>

            {/* Text Preview */}
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Extracted Text Preview</p>
              <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {extractedText.length > 3000
                    ? extractedText.slice(0, 3000) + "\n\n... (truncated for preview)"
                    : extractedText}
                </pre>
              </div>
            </div>

            {/* Pattern Detection */}
            <div className="space-y-3">
              <p className="text-sm text-slate-500 font-medium">
                Detect Sensitive Information
              </p>

              {/* Built-in pattern pills */}
              <div className="flex flex-wrap gap-2">
                {patterns
                  .filter((p) => p.builtIn)
                  .map((pattern) => (
                    <button
                      key={pattern.id}
                      type="button"
                      onClick={() => togglePattern(pattern.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        pattern.enabled
                          ? "bg-rose-500/20 border-rose-400/50 text-rose-300"
                          : "bg-slate-50 border border-slate-200 border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-800"
                      }`}
                    >
                      <Shield size={14} />
                      {pattern.label}
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                          pattern.matchCount > 0
                            ? pattern.enabled
                              ? "bg-rose-500 text-slate-900"
                              : "bg-white/10 text-slate-600"
                            : "bg-slate-50 border border-slate-200 text-slate-400"
                        }`}
                      >
                        {pattern.matchCount}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Custom patterns */}
              {patterns.filter((p) => !p.builtIn).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patterns
                    .filter((p) => !p.builtIn)
                    .map((pattern) => (
                      <button
                        key={pattern.id}
                        type="button"
                        onClick={() => togglePattern(pattern.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border group ${
                          pattern.enabled
                            ? "bg-rose-500/20 border-rose-400/50 text-rose-300"
                            : "bg-slate-50 border border-slate-200 border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-800"
                        }`}
                      >
                        &ldquo;{pattern.label}&rdquo;
                        <span
                          className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                            pattern.matchCount > 0
                              ? pattern.enabled
                                ? "bg-rose-500 text-slate-900"
                                : "bg-white/10 text-slate-600"
                              : "bg-slate-50 border border-slate-200 text-slate-400"
                          }`}
                        >
                          {pattern.matchCount}
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomPattern(pattern.id);
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-800"
                        >
                          <X size={12} />
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {/* Custom text input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomPattern();
                  }}
                  placeholder="Add custom text to redact..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 text-slate-900 placeholder-gray-500 text-sm focus:outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={addCustomPattern}
                  disabled={!customInput.trim()}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:border-rose-400/50 hover:text-rose-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* AI Smart Redact option */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 border border-slate-200 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 bg-slate-50 border border-slate-200 accent-rose-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Brain size={14} className="text-rose-400" />
                    Use AI-Powered Smart Redaction
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Analyses context to redact people's names, locations, and addresses.
                  </span>
                </div>
              </label>

              {useAi && (
                <div className="pt-3 border-t border-slate-200/60 space-y-4">
                  {/* API Key */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Key size={12} className="text-rose-400" />
                        Groq API Key
                      </span>
                      <a
                        href="https://console.groq.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Get Free Key →
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? "text" : "password"}
                          placeholder="gsk_..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-rose-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                        >
                          {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveKey}
                        onChange={(e) => setSaveKey(e.target.checked)}
                        className="rounded border-slate-200 bg-slate-50 border border-slate-200 accent-rose-500"
                      />
                      Save key in browser
                    </label>
                  </div>

                  {/* AI Options */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 block">AI Targets to Redact:</span>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={aiRedactNames}
                          onChange={(e) => setAiRedactNames(e.target.checked)}
                          className="rounded border-slate-200 bg-slate-50 border border-slate-200 accent-rose-500"
                        />
                        Names (e.g. John, Alice)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={aiRedactLocations}
                          onChange={(e) => setAiRedactLocations(e.target.checked)}
                          className="rounded border-slate-200 bg-slate-50 border border-slate-200 accent-rose-500"
                        />
                        Locations & Addresses
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={aiRedactOrgs}
                          onChange={(e) => setAiRedactOrgs(e.target.checked)}
                          className="rounded border-slate-200 bg-slate-50 border border-slate-200 accent-rose-500"
                        />
                        Organizations & Companies
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary & Apply */}
            <div className="pt-2 space-y-3">
              {totalRedactions > 0 && !useAi && (
                <div className="flex items-center gap-2 text-sm text-rose-300">
                  <EyeOff size={16} />
                  <span>
                    {totalRedactions} match{totalRedactions !== 1 ? "es" : ""}{" "}
                    will be redacted across{" "}
                    {enabledPatterns.length} pattern
                    {enabledPatterns.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={applyRedaction}
                disabled={isAiRedacting || (!useAi && enabledPatterns.length === 0)}
                className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    useAi || enabledPatterns.length > 0 ? "#f43f5e" : "#374151",
                }}
                onMouseEnter={(e) => {
                  if (useAi || enabledPatterns.length > 0)
                    e.currentTarget.style.backgroundColor = "#e11d48";
                }}
                onMouseLeave={(e) => {
                  if (useAi || enabledPatterns.length > 0)
                    e.currentTarget.style.backgroundColor = "#f43f5e";
                }}
              >
                {isAiRedacting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    AI analyzing & redacting...
                  </>
                ) : (
                  <>
                    <EyeOff size={20} />
                    Apply Redaction
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Results */}
        {redactedText && (
          <section className="rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-400/40 text-green-800 text-xs flex items-center justify-center">
                <CheckCircle2 size={14} />
              </span>
              Redaction Complete
            </h2>

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">
                Redaction applied successfully!
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Patterns Applied
                </p>
                <p className="text-xl font-bold text-rose-400">
                  {enabledPatterns.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Items Redacted
                </p>
                <p className="text-xl font-bold text-rose-400">
                  {totalRedactions}
                </p>
              </div>
            </div>

            {/* Redacted Preview */}
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Redacted Text Preview
              </p>
              <div className="max-h-80 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 border border-slate-200 p-4">
                <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {renderHighlightedText(
                    redactedText.length > 5000
                      ? redactedText.slice(0, 5000) + "\n\n... (truncated for preview)"
                      : redactedText
                  )}
                </pre>
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#f43f5e" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#e11d48")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#f43f5e")
              }
            >
              <Download size={20} />
              Download Redacted Text (.txt)
            </button>

            {/* Back to configure */}
            <button
              type="button"
              onClick={() => setRedactedText(null)}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
            >
              Adjust redaction patterns
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:border-white/30 hover:text-slate-900 transition-all text-sm"
            >
              Redact another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
