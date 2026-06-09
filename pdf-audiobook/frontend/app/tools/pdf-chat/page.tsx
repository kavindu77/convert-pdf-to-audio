"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Upload,
  FileText,
  ArrowLeft,
  Loader2,
  Mic,
  Send,
  Eye,
  EyeOff,
  Key,
  Trash2,
  Bot,
  User,
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

// OPTIONAL: Hardcode your Groq API key here (e.g., "gsk_...") to bypass entering it in the browser UI
const HARDCODED_GROQ_API_KEY = "";

export default function PdfChatPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);

  // Groq API Key
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(true);

  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
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
      
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      setProgress(30);
      setProgressLabel("Parsing pages...");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPageCount(pdf.numPages);

      let textContent = "";
      const maxPagesToRead = Math.min(pdf.numPages, 100);

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
      
      // Initial bot message
      setMessages([
        {
          role: "assistant",
          content: `Hi! I have loaded "${file.name}" (${pdf.numPages} pages). Ask me anything about it!`,
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
    if (!apiKey.trim()) {
      setError("Please enter a Groq API Key.");
      return;
    }

    if (saveKey) {
      localStorage.setItem("groq_api_key", apiKey);
    }

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
              content: `You are an AI assistant designed to answer questions about a PDF document. Answer questions accurately and truthfully, basing your answers strictly on the extracted document content below. If the information is not in the document, state clearly that it is not available in the document. Do not invent facts.

Document content:
${extractedText.slice(0, 15000)}`,
            },
            ...chatHistory,
            { role: "user", content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API responded with status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;

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

  const clearKey = () => {
    setApiKey("");
    localStorage.removeItem("groq_api_key");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Mic size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
        {file && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20 transition-all"
          >
            Reset PDF
          </button>
        )}
      </header>

      {/* Main chat layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto px-4 py-6 gap-6">
        
        {/* Left Side: File Upload, Key Config & Document details */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto max-h-full pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors py-2"
          >
            <ArrowLeft size={14} />
            All tools
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center">
                <MessageSquare size={20} className="text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-white">PDF Chat / Q&A</h1>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask questions, query concepts, and chat directly with your PDF. Complete client-side security.
            </p>
          </div>

          {/* Upload card */}
          {!extractedText ? (
            <div className="rounded-xl border border-white/10 p-4 space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !file && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                  file ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/25 hover:border-white/40 hover:bg-white/5 cursor-pointer"
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
                  <div className="space-y-2">
                    <FileText size={24} className="mx-auto text-indigo-400" />
                    <p className="font-medium text-xs truncate max-w-full text-white">{file.name}</p>
                    <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto mb-2 text-gray-500" />
                    <p className="text-xs text-gray-300 font-medium">Upload document</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">PDF · max 100 MB</p>
                  </>
                )}
              </div>

              {file && !extractedText && (
                <button
                  onClick={handleExtractText}
                  disabled={isExtracting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#6366f1" }}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Parsing... ({progress}%)
                    </>
                  ) : (
                    "Initialize Chat"
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 p-4 space-y-2 bg-indigo-950/10">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-white truncate flex-1">{file?.name}</span>
              </div>
              <div className="text-[10px] text-gray-400 flex justify-between">
                <span>Pages: {pageCount}</span>
                <span>Size: {file ? formatSize(file.size) : ""}</span>
              </div>
            </div>
          )}

          {/* API Key Panel */}
          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Key size={12} className="text-indigo-400" />
                Groq API Key
              </span>
              <a
                href="https://console.groq.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-400 hover:underline"
              >
                Get Key
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
                className="rounded border-white/10 bg-white/5 accent-indigo-500 text-[10px]"
              />
              Save key in browser
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-normal">
              {error}
            </div>
          )}
        </div>

        {/* Right Side: Chat Container */}
        <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden min-h-[400px] md:min-h-0">
          
          {/* Chat header */}
          <div className="border-b border-white/10 px-4 py-3 flex justify-between items-center bg-white/[0.02] shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Document Chat Session</span>
            {messages.length > 1 && (
              <button
                onClick={() => setMessages(messages.slice(0, 1))}
                className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {!extractedText ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-3">
                <MessageSquare size={36} className="text-gray-700 animate-pulse" />
                <p className="text-xs max-w-xs leading-relaxed">
                  Please upload a PDF and click "Initialize Chat" on the left panel to begin.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border text-xs ${
                      m.role === "user"
                        ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-300"
                        : "bg-white/5 border-white/10 text-gray-400"
                    }`}
                  >
                    {m.role === "user" ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {isSending && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 text-xs">
                  <Bot size={12} />
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/[0.01] shrink-0 flex gap-2">
            <input
              type="text"
              placeholder={extractedText ? "Ask about the document..." : "Initialize PDF first..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!extractedText || isSending}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending || !extractedText}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
              style={{ backgroundColor: "#6366f1" }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
