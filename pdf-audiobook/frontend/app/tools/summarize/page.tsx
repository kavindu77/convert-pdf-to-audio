"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// OPTIONAL: Hardcode your Groq API key here (e.g., "gsk_...") to bypass entering it in the browser UI
const HARDCODED_GROQ_API_KEY = "";

export default function SummarizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);
  
  // Groq API Key state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(true);

  // Summarize settings
  const [length, setLength] = useState<"brief" | "standard" | "detailed">("standard");
  const [style, setStyle] = useState<"bullets" | "paragraph" | "takeaways">("bullets");

  const [summary, setSummary] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setSummary("");
    setExtractedText("");
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

  const handleExtractText = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Loading PDF parser...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load pdfjs dynamically
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      setProgress(30);
      setProgressLabel("Parsing pages...");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPageCount(pdf.numPages);

      let textContent = "";
      const maxPagesToRead = Math.min(pdf.numPages, 100); // Limit context size

      for (let i = 1; i <= maxPagesToRead; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        textContent += pageText + "\n";
        
        setProgress(Math.round(30 + (i / maxPagesToRead) * 60));
        setProgressLabel(`Extracting page ${i} of ${maxPagesToRead}...`);
      }

      if (!textContent.trim()) {
        throw new Error("No readable text found in PDF.");
      }

      setExtractedText(textContent);
      setProgress(100);
      setProgressLabel("Text extracted!");
    } catch (err: any) {
      setError(`Extraction failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSummarize = async () => {
    if (!extractedText) return;
    if (!apiKey.trim()) {
      setError("Please enter a Groq API Key.");
      return;
    }

    if (saveKey) {
      localStorage.setItem("groq_api_key", apiKey);
    } else {
      localStorage.removeItem("groq_api_key");
    }

    setIsSummarizing(true);
    setError(null);
    setSummary("");

    try {
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
              content: `You are a professional research assistant that summarizes documents. Generate a clear, concise, and structured summary of the document text provided.
Guidelines:
- Length requested: ${length} (Brief: 3-5 key sentences, Standard: 2-3 well-structured paragraphs, Detailed: A comprehensive breakdown)
- Style requested: ${style} (bullets: clean list of bullets with bold key phrases, paragraph: natural flowing narrative prose, takeaways: a structured list of key strategic insights and conclusions)
- Focus on accuracy and key findings. Avoid introduction fluff. Do not refer to the text as "the provided text", write direct insights.`,
            },
            {
              role: "user",
              content: `Here is the document content (extracted first 12,000 characters for analysis):\n\n${extractedText.slice(0, 12000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API responded with status ${response.status}`);
      }

      const data = await response.json();
      const generatedSummary = data.choices?.[0]?.message?.content;
      
      if (!generatedSummary) {
        throw new Error("No summary returned from model.");
      }

      // Simulate a fast streaming effect
      let currentText = "";
      const words = generatedSummary.split(" ");
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < words.length) {
          currentText += (index === 0 ? "" : " ") + words[index];
          setSummary(currentText);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 15);

    } catch (err: any) {
      setError(`Summarization failed: ${err.message || err}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary || !file) return;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setSummary("");
    setError(null);
    setProgress(0);
    setProgressLabel("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const clearKey = () => {
    setApiKey("");
    localStorage.removeItem("groq_api_key");
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
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/20 flex items-center justify-center">
              <Sparkles size={20} className="text-fuchsia-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF Summarizer</h1>
          </div>
          <p className="text-gray-400">
            Generate high-quality summaries, key takeaways, or bullet points from any PDF document. Powered by Groq AI for instant results.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload PDF
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              file ? "border-fuchsia-500/30 bg-fuchsia-500/5" : "border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer"
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
                  <FileText size={24} className="text-fuchsia-400" />
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
                <p className="text-gray-300 font-medium">Drop your PDF here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse · max 100 MB</p>
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

        {/* API Key Banner */}
        {file && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Key size={16} className="text-fuchsia-400" />
                  Groq API Configuration
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Summaries are processed client-side by sending your text securely to Groq. You need a free API key.
                </p>
              </div>
              <a
                href="https://console.groq.com/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1 font-medium"
              >
                Get Free API Key →
              </a>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-fuchsia-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {apiKey && (
                <button
                  type="button"
                  onClick={clearKey}
                  className="px-3 rounded-xl border border-white/10 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
                className="rounded border-white/10 bg-white/5 accent-fuchsia-500"
              />
              Remember key in this browser
            </label>
          </section>
        )}

        {/* Step 2: Extract & Summarize Configuration */}
        {file && !extractedText && (
          <button
            onClick={handleExtractText}
            disabled={isExtracting}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "#d946ef" }}
          >
            {isExtracting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {progressLabel} ({progress}%)
              </>
            ) : (
              <>
                <FileText size={20} />
                Prepare PDF text
              </>
            )}
          </button>
        )}

        {extractedText && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-xs flex items-center justify-center">
                2
              </span>
              Summary Options
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Length */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Summary Length</label>
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                  {(["brief", "standard", "detailed"] as const).map((len) => (
                    <button
                      key={len}
                      onClick={() => setLength(len)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
                        length === len ? "bg-fuchsia-500 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Output Style</label>
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                  {(["bullets", "paragraph", "takeaways"] as const).map((sty) => (
                    <button
                      key={sty}
                      onClick={() => setStyle(sty)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
                        style === sty ? "bg-fuchsia-500 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {sty}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSummarize}
              disabled={isSummarizing || !apiKey.trim()}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: "#d946ef" }}
            >
              {isSummarizing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Summary
                </>
              )}
            </button>
          </section>
        )}

        {/* Step 3: Results */}
        {summary && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-300 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-xs flex items-center justify-center">
                  3
                </span>
                Document Summary
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1 text-xs"
                >
                  {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1 text-xs"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-6 max-h-[500px] overflow-y-auto leading-relaxed text-gray-200 text-sm font-sans space-y-3 whitespace-pre-wrap">
              {summary}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5 transition-all text-sm font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} className={isSummarizing ? "animate-spin" : ""} />
                Regenerate Summary
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white transition-all text-sm font-semibold"
              >
                Summarize another PDF
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
