"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Globe,
  Mic,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { uploadPDF, getJobStatus, getSupportedLanguages, JobStatus } from "@/lib/api";

const API_URL = "https://convert-pdf-to-audio.onrender.com";

const POPULAR_LANGUAGES = [
  "en", "es", "fr", "de", "ar", "hi", "zh", "ja", "ko", "pt",
  "ru", "tr", "vi", "id", "si", "ta", "bn", "ur", "ne",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued...",
  extracting: "Extracting text...",
  translating: "Translating...",
  generating_audio: "Generating audio...",
  completed: "Done!",
  failed: "Failed",
};

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("es");
  const [voiceGender, setVoiceGender] = useState("neutral");
  const [languages, setLanguages] = useState<Record<string, string>>({});
  const [langSearch, setLangSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getSupportedLanguages().then(setLanguages).catch(() => {});
  }, []);

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

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
      setJobId(null);
      setJobStatus(null);
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
      const res = await uploadPDF(file, targetLang, "auto", voiceGender);
      setJobId(res.job_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredLangs = Object.entries(languages).filter(
    ([code, name]) =>
      !langSearch ||
      name.toLowerCase().includes(langSearch.toLowerCase()) ||
      code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const popularFirst = [
    ...filteredLangs.filter(([c]) => POPULAR_LANGUAGES.includes(c)),
    ...filteredLangs.filter(([c]) => !POPULAR_LANGUAGES.includes(c)),
  ];

  const isProcessing = jobStatus && !["completed", "failed"].includes(jobStatus.status);
  const isDone = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";

  // Build full audio URL with backend prefix
  const getAudioUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Mic size={18} />
        </div>
        <span className="font-semibold text-lg tracking-tight">PDF Audiobook</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Convert PDF to Audiobook</h1>
          <p className="text-gray-400">Upload a PDF, choose your language, and generate audio.</p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragActive ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 hover:border-white/40 hover:bg-white/5"}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-indigo-400" />
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 font-medium">Drop your PDF here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse · max 50 MB</p>
              </>
            )}
          </div>
        </section>

        {/* Step 2: Language & Voice */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs flex items-center justify-center">2</span>
            Choose Language & Voice
          </h2>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <span>{languages[targetLang] || targetLang}</span>
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-xl bg-gray-900 border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-2 border-b border-white/10">
                  <input
                    type="text"
                    placeholder="Search language..."
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {popularFirst.map(([code, name]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => { setTargetLang(code); setLangOpen(false); setLangSearch(""); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${targetLang === code ? "text-indigo-400 bg-indigo-500/10" : "text-gray-300"}`}
                    >
                      {name}
                      {POPULAR_LANGUAGES.includes(code) && (
                        <span className="ml-2 text-xs text-gray-600">popular</span>
                      )}
                    </button>
                  ))}
                  {popularFirst.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No languages found</p>
                  )}
                </div>
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
                    ? "bg-indigo-500 border-indigo-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <XCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit */}
        {!jobId && (
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

        {/* Progress & Results */}
        {jobStatus && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDone && <CheckCircle2 size={20} className="text-green-400" />}
                {isFailed && <XCircle size={20} className="text-red-400" />}
                {isProcessing && <Loader2 size={20} className="animate-spin text-indigo-400" />}
                <span className="font-medium">{STATUS_LABELS[jobStatus.status] || jobStatus.status}</span>
              </div>
              <span className="text-sm text-gray-400">{jobStatus.progress_percent}%</span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${jobStatus.progress_percent}%` }}
              />
            </div>

            {jobStatus.is_scanned_pdf && (
              <p className="text-xs text-amber-400">⚠ Scanned PDF detected — using OCR for text extraction.</p>
            )}

            {isFailed && jobStatus.error_message && (
              <p className="text-sm text-red-400">{jobStatus.error_message}</p>
            )}

            {/* Audio Results */}
            {isDone && jobStatus.chapter_urls && jobStatus.chapter_urls.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-gray-400">
                  {jobStatus.chapter_urls.length} chapter{jobStatus.chapter_urls.length > 1 ? "s" : ""} ready
                  — {jobStatus.target_language_name}
                </p>
                {jobStatus.chapter_urls.map((url, i) => {
                  const fullUrl = getAudioUrl(url);
                  return (
                    <div key={url} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-sm text-gray-300 w-20">Chapter {i + 1}</span>
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

                {/* Convert another */}
                <button
                  type="button"
                  onClick={() => { setFile(null); setJobId(null); setJobStatus(null); setError(null); }}
                  className="w-full mt-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all text-sm"
                >
                  Convert another PDF
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}