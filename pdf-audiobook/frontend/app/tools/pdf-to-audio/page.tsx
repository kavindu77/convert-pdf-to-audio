"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { uploadPDF, getJobStatus, JobStatus } from "@/lib/api";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import ToolOptionsPanel from "@/app/components/tools/ToolOptionsPanel";
import { FileText, X, Globe, ChevronDown, Download, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";

const API_URL = "https://convert-pdf-to-audio.onrender.com";

const SUPPORTED_LANGUAGES = [
  { code: "es", name: "Spanish",    flag: "🇪🇸", region: "Spain, Latin America" },
  { code: "fr", name: "French",     flag: "🇫🇷", region: "France, Canada" },
  { code: "de", name: "German",     flag: "🇩🇪", region: "Germany, Austria" },
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function PdfToAudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [voiceGender, setVoiceGender] = useState("neutral");
  const [langOpen, setLangOpen] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId]);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const selected = files[0];
      if (selected.size > 50 * 1024 * 1024) {
        setError("File too large (max 50 MB).");
        return;
      }
      setFile(selected);
      setError(null);
      setJobId(null);
      setJobStatus(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const res = await uploadPDF(file, targetLang, "auto", voiceGender);
      setJobId(res.job_id);
    } catch (e: any) {
      console.error("Audio generation failed:", e);
      const detail = e?.response?.data?.detail || e?.message || "Upload failed. Please try again.";
      setError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setJobId(null);
    setJobStatus(null);
    setError(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
  };

  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
  const isProcessing = jobStatus && !["completed", "failed"].includes(jobStatus.status);
  const isDone = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";

  const getAudioUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <ToolPageShell
      slug="pdf-to-audio"
      category="ai"
      howItWorksSteps={[
        "Upload your study guide or book PDF.",
        "Choose target speech language and voice gender.",
        "Convert to audiobook and download MP3 chapters."
      ]}
    >
      <ToolHeader
        title="PDF to Audiobook"
        description="Convert any PDF textbook or document into audio narration with multi-language speech support."
        slug="pdf-to-audio"
        minPlan="business"
        processing="server"
        output="audio"
        taskCost={5}
      />

      {file === null && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox onFileSelect={handleFileSelect} subLabel="PDF · max 50 MB" />
          <ToolNotice processing="server" />
        </div>
      )}

      {file !== null && !jobId && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start animate-in">
          {/* Left Panel: Selected File */}
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
              <FileText size={32} className="text-[#6366f1] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                <XCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Settings / Process Button */}
          <div className="space-y-4">
            <ToolOptionsPanel title="Audiobook Options">
              {/* Language Selection */}
              <div className="space-y-2 relative">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Language</label>
                <button
                  type="button"
                  onClick={() => setLangOpen(!langOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    {selectedLang ? (
                      <>
                        <span className="text-sm">{selectedLang.flag}</span>
                        <span>{selectedLang.name}</span>
                      </>
                    ) : (
                      "Select Language"
                    )}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-250 ${langOpen ? "rotate-180" : ""}`} />
                </button>

                {langOpen && (
                  <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => { setTargetLang(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-none cursor-pointer
                          ${targetLang === lang.code ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-600 text-xs font-medium"}`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 font-bold">{lang.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">{lang.region}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Gender Selection */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Voice Tone</label>
                <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px]">
                  {["neutral", "female", "male"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setVoiceGender(g)}
                      className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer capitalize ${
                        voiceGender === g ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </ToolOptionsPanel>

            {isUploading ? (
              <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-sm text-center">
                <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-650" />
                <p className="text-xs font-bold text-slate-600">Uploading PDF Document...</p>
              </div>
            ) : (
              <ToolActionButton
                onClick={handleSubmit}
                label="Convert PDF to Audiobook"
                icon={<Play size={14} fill="currentColor" />}
              />
            )}
          </div>
        </div>
      )}

      {/* Progress & Processing Panel */}
      {jobId && !isDone && !isFailed && (
        <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200/85 p-6 rounded-2xl shadow-sm space-y-4 animate-in">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-650" />
              <span className="font-bold text-slate-700">
                {jobStatus ? STATUS_LABELS[jobStatus.status] : "Queued..."}
              </span>
            </div>
            <span className="font-mono font-bold">{jobStatus?.progress_percent ?? 0}%</span>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${jobStatus?.progress_percent ?? 0}%` }}
            />
          </div>

          {jobStatus && jobStatus.total_pages > 0 && (
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
              Processing page {jobStatus.processed_pages} of {jobStatus.total_pages}
            </p>
          )}

          {jobStatus?.is_scanned_pdf && (
            <p className="text-[10px] text-amber-600 font-bold text-center bg-amber-50 py-1 rounded-lg border border-amber-200/30">
              ⚠ Scanned PDF detected — using OCR for text extraction.
            </p>
          )}

          <button
            onClick={handleReset}
            className="w-full py-2.5 border border-slate-200 text-xs text-slate-400 hover:text-slate-800 rounded-xl transition-all hover:bg-slate-50 bg-white shadow-sm font-bold cursor-pointer"
          >
            Cancel Job
          </button>
        </div>
      )}

      {/* Completed Results Display */}
      {isDone && jobStatus && jobStatus.chapter_urls && jobStatus.chapter_urls.length > 0 && (
        <div className="w-full">
          <ToolResultPanel
            title="Audiobook Generated Successfully!"
            subTitle={`${jobStatus.chapter_urls.length} audio chapters ready · Language: ${jobStatus.target_language_name}`}
            onReset={handleReset}
            resetLabel="Convert another document"
          >
            <div className="space-y-4">
              {jobStatus.chapter_urls.map((url, i) => {
                const fullUrl = getAudioUrl(url);
                return (
                  <div
                    key={url}
                    className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60 gap-3"
                  >
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Chapter {i + 1}</span>
                    <audio controls src={fullUrl} className="flex-1 max-w-md w-full h-8" />
                    <a
                      href={fullUrl}
                      download={`chapter-${i + 1}.mp3`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap border-none cursor-pointer"
                    >
                      <Download size={13} /> Download MP3
                    </a>
                  </div>
                );
              })}
            </div>
          </ToolResultPanel>
        </div>
      )}

      {/* Job Failure Display */}
      {isFailed && (
        <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200/85 p-6 rounded-2xl shadow-sm text-center space-y-4 animate-in">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-650">
            <XCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800">Conversion Failed</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {jobStatus?.error_message || "An unexpected error occurred while converting the PDF file."}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </ToolPageShell>
  );
}
