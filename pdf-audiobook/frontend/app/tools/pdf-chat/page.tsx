"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import {
  MessageSquare,
  FileText,
  X,
  Send,
  Bot,
  User,
  Trash2
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PdfChatPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);

  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setMessages([]);
    setExtractedText("");
  }, []);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleExtractText = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Loading PDF parser...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      setProgress(20);
      setProgressLabel("Reading document details...");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;
      setPageCount(count);

      setProgress(40);
      setProgressLabel("Parsing pages...");

      let textContent = "";
      const maxPagesToRead = Math.min(count, 100);

      for (let i = 1; i <= maxPagesToRead; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        textContent += pageText + "\n";
        
        setProgress(Math.round(40 + (i / maxPagesToRead) * 50));
        setProgressLabel(`Extracting page ${i} of ${maxPagesToRead}...`);
      }

      if (!textContent.trim()) {
        throw new Error("No readable text found in PDF.");
      }

      setExtractedText(textContent);
      setProgress(100);
      setProgressLabel("Text extracted!");

      setMessages([
        {
          role: "assistant",
          content: `Hi! I have loaded "${file.name}" (${count} pages). Ask me anything about it!`,
        },
      ]);
    } catch (err: any) {
      setError(`Extraction failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isSending || !extractedText) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: extractedText,
          question: userMessage,
          chatHistory,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content;

      if (!reply) {
        throw new Error("No response returned from the model.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setError(`Failed to get response: ${err.message || err}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setMessages([]);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ToolPageShell
      slug="pdf-chat"
      category="ai"
      howItWorksSteps={[
        "Upload your PDF document.",
        "Wait a moment for our secure parser to extract page text.",
        "Type questions in the chat panel to fetch instant AI responses."
      ]}
    >
      <ToolHeader
        title="PDF Chat"
        description="Run conversational prompts directly against document context using secure server-side AI."
        slug="pdf-chat"
        minPlan="pro"
        processing="ai"
        output="report"
        taskCost={2}
      />

      {!extractedText && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {file === null ? (
            <ToolUploadBox onFileSelect={handleFileSelect} />
          ) : (
            <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Selected PDF File</h3>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-55 hover:bg-red-50 hover:text-red-650 rounded-xl text-xs font-bold text-slate-450 transition-all border border-slate-200/50 cursor-pointer"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 max-w-xl mx-auto w-full">
                <FileText size={32} className="text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
                </div>
              </div>

              {isExtracting ? (
                <div className="space-y-2 max-w-xl mx-auto pt-2">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>{progressLabel}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto pt-2">
                  <ToolActionButton
                    onClick={handleExtractText}
                    label="Initialize Chat"
                    icon={<MessageSquare size={15} />}
                  />
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs max-w-2xl mx-auto">
              <X size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <ToolNotice processing="ai" />
        </div>
      )}

      {extractedText && (
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch min-h-[460px]">
          {/* Left panel: File stats */}
          <div className="md:col-span-1 bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Document Details
              </h3>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                <FileText size={16} className="text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate flex-1">{file?.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-2">
                <div className="flex justify-between">
                  <span>Pages</span>
                  <span className="font-extrabold text-slate-850">{pageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size</span>
                  <span className="font-extrabold text-slate-850">{file ? formatSize(file.size) : ""}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-6 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-colors border-none cursor-pointer"
            >
              Reset Session
            </button>
          </div>

          {/* Right panel: Chat UI */}
          <div className="md:col-span-3 bg-white border border-slate-200/85 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden relative">
            {/* Header */}
            <div className="border-b border-slate-100 px-4 py-3 flex justify-between items-center bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chat Session</span>
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages(messages.slice(0, 1))}
                  className="p-1 rounded text-slate-400 hover:text-red-650 transition-colors border-none bg-transparent cursor-pointer"
                  title="Clear Chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[360px] min-h-[300px]">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border text-[10px] ${
                      m.role === "user"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                        : "bg-slate-100 border-slate-200 text-slate-500 font-bold"
                    }`}
                  >
                    {m.role === "user" ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
                    <Bot size={12} />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 rounded-tl-none flex flex-col gap-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span>Analyzing document...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-55 border-y border-red-100 text-red-600 text-xs">
                {error}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about the document..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSending}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 text-slate-850"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-indigo-650 hover:bg-indigo-700 transition-all disabled:opacity-40 shrink-0 border-none cursor-pointer"
                style={{ backgroundColor: "#6366f1" }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
