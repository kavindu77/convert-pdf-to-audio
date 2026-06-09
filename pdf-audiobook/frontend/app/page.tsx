"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileText, Mic, Play, Download, Loader2,
  CheckCircle2, XCircle, ChevronDown, Sparkles,
  Volume2, Languages, Zap,
} from "lucide-react";
import { uploadPDF, getJobStatus, getSupportedLanguages, JobStatus } from "@/lib/api";

const API_URL = "https://convert-pdf-to-audio.onrender.com";
const POPULAR = ["en","es","fr","de","hi","ar","zh","ja","ko","pt","ru","tr","si","ta","bn"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Queued...", extracting: "Reading PDF...", translating: "Translating...",
  generating_audio: "Generating audio...", completed: "Complete!", failed: "Failed",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-400", extracting: "text-blue-400", translating: "text-violet-400",
  generating_audio: "text-indigo-400", completed: "text-emerald-400", failed: "text-red-400",
};

export default function PdfToAudioPage() {
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

  useEffect(() => { getSupportedLanguages().then(setLanguages).catch(() => {}); }, []);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const s = await getJobStatus(jobId);
        setJobStatus(s);
        if (s.status === "completed" || s.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setError(null); setJobId(null); setJobStatus(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] }, maxFiles: 1, maxSize: 50 * 1024 * 1024,
    onDropRejected: (f) => setError(f[0]?.errors[0]?.code === "file-too-large" ? "File too large (max 50 MB)." : "Only PDF files accepted."),
  });

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true); setError(null);
    try {
      const res = await uploadPDF(file, targetLang, "auto", voiceGender);
      setJobId(res.job_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Upload failed. Please try again.");
    } finally { setIsUploading(false); }
  };

  const getAudioUrl = (url: string) => (!url ? "" : url.startsWith("http") ? url : `${API_URL}${url}`);

  const filteredLangs = Object.entries(languages).filter(([code, name]) =>
    !langSearch || name.toLowerCase().includes(langSearch.toLowerCase()) || code.toLowerCase().includes(langSearch.toLowerCase())
  );
  const sortedLangs = [...filteredLangs.filter(([c]) => POPULAR.includes(c)), ...filteredLangs.filter(([c]) => !POPULAR.includes(c))];

  const isProcessing = jobStatus && !["completed","failed"].includes(jobStatus.status);
  const isDone = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";
  const langName = languages[targetLang] || targetLang;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      <header className="relative border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0f]/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Mic size={16} />
            </div>
            <span className="font-bold tracking-tight">PDF Audiobook</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Free · No signup
          </div>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-6 py-12 space-y-6">
        <div className="text-center space-y-3 pb-2">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1.5 rounded-full mb-2">
            <Sparkles size={12} />
            AI-Powered Translation + Voice
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
            Turn any PDF into<br />an Audiobook
          </h1>
          <p className="text-gray-500 text-base">Upload · Translate · Listen in 100+ languages</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Languages, label: "100+ Languages", sub: "Including Sinhala, Tamil" },
            { icon: Zap, label: "Instant", sub: "No waiting required" },
            { icon: Volume2, label: "Natural Voice", sub: "High quality audio" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
              <Icon size={20} className="mx-auto mb-2 text-indigo-400" />
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        <div
          {...getRootProps()}
          className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 group
            ${isDragActive ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
              : file ? "border-indigo-500/40 bg-indigo-500/5"
              : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <FileText size={26} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to convert</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setJobId(null); setJobStatus(null); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Choose different file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                <Upload size={24} className="text-gray-500 group-hover:text-gray-400 transition-colors" />
              </div>
              <div>
                <p className="font-semibold text-gray-300">Drop your PDF here</p>
                <p className="text-sm text-gray-600 mt-1">or click to browse · PDF up to 50 MB</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Languages size={15} className="text-indigo-400" />
            Output Language & Voice
          </h2>
          <div className="relative">
            <button type="button" onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors">
              <span className="font-medium text-white">{langName}</span>
              <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-xl bg-[#111118] border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-2 border-b border-white/[0.06]">
                  <input autoFocus type="text" placeholder="Search language..." value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    className="w-full bg-white/[0.05] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none border border-white/[0.06] focus:border-indigo-500/40" />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {sortedLangs.length === 0 && <p className="text-center text-gray-600 py-4 text-sm">No languages found</p>}
                  {sortedLangs.map(([code, name]) => (
                    <button key={code} type="button"
                      onClick={() => { setTargetLang(code); setLangOpen(false); setLangSearch(""); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.05] transition-colors
                        ${targetLang === code ? "text-indigo-400 bg-indigo-500/10" : "text-gray-300"}`}>
                      <span>{name}</span>
                      {POPULAR.includes(code) && <span className="text-xs text-gray-700 bg-white/[0.05] px-2 py-0.5 rounded-full">popular</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {["neutral","female","male"].map((g) => (
              <button key={g} type="button" onClick={() => setVoiceGender(g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize
                  ${voiceGender === g
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-white/[0.03] border-white/[0.07] text-gray-500 hover:border-white/20 hover:text-gray-300"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!jobId && (
          <button type="button" disabled={!file || isUploading} onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/20">
            {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</>
              : <><Play size={18} fill="white" /> Convert to Audiobook</>}
          </button>
        )}

        {jobStatus && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isDone && <CheckCircle2 size={18} className="text-emerald-400" />}
                {isFailed && <XCircle size={18} className="text-red-400" />}
                {isProcessing && <Loader2 size={18} className="animate-spin text-indigo-400" />}
                <span className={`font-semibold text-sm ${STATUS_COLORS[jobStatus.status] || "text-gray-300"}`}>
                  {STATUS_LABELS[jobStatus.status] || jobStatus.status}
                </span>
              </div>
              <span className="text-sm font-mono text-gray-600">{jobStatus.progress_percent}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-emerald-500" : isFailed ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                style={{ width: `${jobStatus.progress_percent}%` }} />
            </div>
            {jobStatus.total_pages > 0 && (
              <p className="text-xs text-gray-600">{jobStatus.processed_pages} of {jobStatus.total_pages} pages processed</p>
            )}
            {isFailed && jobStatus.error_message && (
              <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{jobStatus.error_message}</p>
            )}
            {isDone && jobStatus.chapter_urls && jobStatus.chapter_urls.length > 0 && (
              <div className="space-y-3 pt-1">
                <p className="text-sm text-gray-400 font-medium">
                  {jobStatus.chapter_urls.length} chapter{jobStatus.chapter_urls.length > 1 ? "s" : ""} ready in{" "}
                  <span className="text-white">{jobStatus.target_language_name}</span>
                </p>
                <div className="space-y-2">
                  {jobStatus.chapter_urls.map((url, i) => {
                    const fullUrl = getAudioUrl(url);
                    return (
                      <div key={url} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/15 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Volume2 size={14} className="text-indigo-400" />
                        </div>
                        <span className="text-sm text-gray-400 w-16 shrink-0">Ch. {i + 1}</span>
                        <audio controls src={fullUrl} className="flex-1 h-8 min-w-0" />
                        <a href={fullUrl} download={`chapter-${i + 1}.mp3`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-xs font-semibold transition-colors shrink-0 border border-indigo-500/30">
                          <Download size={12} />MP3
                        </a>
                      </div>
                    );
                  })}
                </div>
                <button type="button"
                  onClick={() => { setFile(null); setJobId(null); setJobStatus(null); setError(null); }}
                  className="w-full mt-2 py-3 rounded-xl border border-white/[0.07] text-gray-500 hover:border-white/15 hover:text-gray-300 transition-all text-sm font-medium">
                  Convert another PDF
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative border-t border-white/[0.05] mt-20 py-8">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-700">PDF Audiobook · Free · No signup required · 100+ languages</p>
        </div>
      </footer>
    </div>
  );
}
