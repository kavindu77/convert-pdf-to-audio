"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { verifyUsageAndGetToken } from "@/app/utils/usageClient";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import ToolOptionsPanel from "@/app/components/tools/ToolOptionsPanel";
import { Sparkles, FileText, X, Copy, Check } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function SummarizePdfPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);

  // Secure job token tracking states
  const [activeJobToken, setActiveJobToken] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Summarize settings
  const [length, setLength] = useState<"brief" | "standard" | "detailed">("standard");
  const [style, setStyle] = useState<"bullets" | "paragraph" | "takeaways">("bullets");

  const [summary, setSummary] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleExtractAndSummarize = async () => {
    if (!file) return;

    if (!isSignedIn) {
      const clerk = (window as any).Clerk;
      if (clerk) {
        clerk.openSignIn();
      } else {
        router.push("/sign-in");
      }
      return;
    }

    setIsSummarizing(true);
    setError(null);
    setSummary("");
    setProgress(10);
    setProgressLabel("Loading PDF parser...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      setProgress(25);
      setProgressLabel("Reading document...");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;
      setPageCount(count);
      const fileSizeMb = file.size / (1024 * 1024);

      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "summarize",
        toolName: "PDF Summarizer",
        fileSizeMb,
        pageCount: count,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsSummarizing(false);
        return;
      }

      setProgress(40);
      setProgressLabel("Extracting text contents...");

      let textContent = "";
      const maxPagesToRead = Math.min(count, 100);

      for (let i = 1; i <= maxPagesToRead; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        textContent += pageText + "\n";
        
        setProgress(Math.round(40 + (i / maxPagesToRead) * 35));
        setProgressLabel(`Parsing page ${i} of ${maxPagesToRead}...`);
      }

      if (!textContent.trim()) {
        throw new Error("No readable text found in PDF.");
      }

      setExtractedText(textContent);
      setProgress(80);
      setProgressLabel("Querying AI engine...");

      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobToken: checkResult.jobToken,
          jobId: checkResult.jobId,
          fileSizeMb,
          pageCount: count,
          documentText: textContent,
          summaryLength: length,
          summaryStyle: style,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.summary;

      if (!summaryText) {
        throw new Error("No summary returned from model.");
      }

      // Sync local tasksUsed cache
      const prevUsed = parseInt(localStorage.getItem("user_tasks_used_today") || "0", 10);
      localStorage.setItem("user_tasks_used_today", String(prevUsed + (checkResult.taskCost || 1)));
      
      // Sync trials count
      if (checkResult.isProTrial) {
        const trialsUsed = parseInt(localStorage.getItem("pro_trials_used") || "0", 10);
        localStorage.setItem("pro_trials_used", String(trialsUsed + 1));
      }
      window.dispatchEvent(new Event("storage"));

      setSummary(summaryText);
      setProgress(100);
      setProgressLabel("Summary complete!");
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

  const handleDownloadText = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.pdf$/i, "")}_summary.txt`;
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
    setActiveJobToken(null);
    setActiveJobId(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ToolPageShell
      slug="summarize"
      category="ai"
      howItWorksSteps={[
        "Upload the PDF document you want to summarize.",
        "Choose summary length and style presets.",
        "Click Summarize PDF and download your summary as a text file."
      ]}
    >
      <ToolHeader
        title="PDF Summarizer"
        description="Condense long documents into bullet points or paragraphs using secure server-side AI."
        slug="summarize"
        minPlan="pro"
        processing="ai"
        output="txt"
        taskCost={2}
      />

      {file === null && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox onFileSelect={handleFileSelect} />
          <ToolNotice processing="ai" />
        </div>
      )}

      {file !== null && !summary && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start animate-in">
          {/* Left Panel: Selected File Display */}
          <div className="md:col-span-2 bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Selected PDF File</h3>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-xl text-xs font-bold text-slate-500 transition-all border border-slate-200/50 cursor-pointer"
              >
                <X size={12} /> Clear
              </button>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 max-w-xl mx-auto w-full">
              <FileText size={32} className="text-indigo-650 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Settings and Trigger */}
          <div className="space-y-4">
            <ToolOptionsPanel title="Summary Settings">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Length</label>
                <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px]">
                  {["brief", "standard", "detailed"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLength(l as any)}
                      className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                        length === l ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                      }`}
                    >
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Style</label>
                <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px]">
                  {[
                    { id: "bullets", name: "Bullets" },
                    { id: "paragraph", name: "Paragraph" },
                    { id: "takeaways", name: "Insights" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id as any)}
                      className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                        style === s.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </ToolOptionsPanel>

            {isSummarizing ? (
              <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-sm space-y-2.5 animate-in">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-indigo-650">{progressLabel}</span>
                  <span className="font-mono font-bold">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <ToolActionButton
                onClick={handleExtractAndSummarize}
                label="Summarize PDF"
                icon={<Sparkles size={15} />}
              />
            )}
          </div>
        </div>
      )}

      {summary && (
        <div className="w-full">
          <ToolResultPanel
            title="Summary generated successfully!"
            subTitle={`${summary.split(/\s+/).length} words generated`}
            onDownload={handleDownloadText}
            downloadLabel="Download Summary (.txt)"
            onReset={handleReset}
            resetLabel="Summarize another document"
          >
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-xs leading-relaxed max-h-[300px] overflow-y-auto font-medium text-slate-700 relative group">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all cursor-pointer"
                title="Copy Summary"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
              <div className="whitespace-pre-wrap pr-6">{summary}</div>
            </div>
          </ToolResultPanel>
        </div>
      )}
    </ToolPageShell>
  );
}
