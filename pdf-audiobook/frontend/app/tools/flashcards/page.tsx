"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Upload,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
  Mic,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  RotateCw,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface Flashcard {
  front: string;
  back: string;
}

// OPTIONAL: Hardcode your Groq API key here (e.g., "gsk_...") to bypass entering it in the browser UI
const HARDCODED_GROQ_API_KEY = "";

export default function FlashcardsPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);

  // Groq API Key
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(true);

  // Flashcards configuration
  const [cardCount, setCardCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"basic" | "intermediate" | "advanced">("intermediate");

  // Results
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Custom review lists
  const [knownCards, setKnownCards] = useState<Record<number, boolean>>({});

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
    setFlashcards([]);
    setExtractedText("");
    setKnownCards({});
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
    } catch (err: any) {
      setError(`Extraction failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!extractedText) return;
    if (!apiKey.trim()) {
      setError("Please enter a Groq API Key.");
      return;
    }

    if (saveKey) {
      localStorage.setItem("groq_api_key", apiKey);
    }

    setIsGenerating(true);
    setError(null);
    setFlashcards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an expert educator. You generate flashcards to study a provided text. 
Return a JSON object containing a "flashcards" array. Each item in the array must be an object with:
- "front": A concise, clear question or term.
- "back": A summary, definition, or explanation (under 3 sentences).

Generate exactly ${cardCount} cards of ${difficulty} difficulty.
Return ONLY valid JSON in this structure: { "flashcards": [ { "front": "...", "back": "..." } ] }`,
            },
            {
              role: "user",
              content: `Create flashcards for this text:\n\n${extractedText.slice(0, 10000)}`,
            },
          ],
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API responded with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No flashcards returned from the model.");
      }

      const parsed = JSON.parse(content);
      const cardsList = parsed.flashcards;

      if (!cardsList || !Array.isArray(cardsList)) {
        throw new Error("Invalid format returned by AI.");
      }

      setFlashcards(cardsList);
    } catch (err: any) {
      setError(`Flashcard generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex((prev) => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex((prev) => prev - 1);
      }, 150);
    }
  };

  const handleKnownToggle = (idx: number) => {
    setKnownCards((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const exportToJson = () => {
    if (flashcards.length === 0 || !file) return;
    const blob = new Blob([JSON.stringify(flashcards, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}-flashcards.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    if (flashcards.length === 0 || !file) return;
    const csvContent = "Question,Answer\n" + 
      flashcards.map(c => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}-flashcards.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setFlashcards([]);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setKnownCards({});
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
              <Layers size={20} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF to Study Flashcards</h1>
          </div>
          <p className="text-gray-400">
            Convert any textbook or study guide PDF into interactive question-and-answer flashcards automatically.
          </p>
        </div>

        {/* Step 1: Upload */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-center">
              1
            </span>
            Upload Study PDF
          </h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              file ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer"
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
                  <FileText size={24} className="text-emerald-400" />
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
                <p className="text-gray-300 font-medium">Drop your study material here</p>
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

        {/* API Key Configure */}
        {file && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Key size={16} className="text-emerald-400" />
                  Groq API Key
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Flashcard generation runs client-side. Get a free key at groq.com.
                </p>
              </div>
              <a
                href="https://console.groq.com/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
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
          </section>
        )}

        {/* Step 2: Extract & Flashcard Configuration */}
        {file && !extractedText && (
          <button
            onClick={handleExtractText}
            disabled={isExtracting}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "#10b981" }}
          >
            {isExtracting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing PDF... ({progress}%)
              </>
            ) : (
              <>
                <FileText size={20} />
                Prepare PDF text
              </>
            )}
          </button>
        )}

        {extractedText && flashcards.length === 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-center">
                2
              </span>
              Flashcard Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card count */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Number of Cards: {cardCount}</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>5 cards</span>
                  <span>15 cards</span>
                  <span>30 cards</span>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Difficulty Level</label>
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                  {(["basic", "intermediate", "advanced"] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
                        difficulty === diff ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateCards}
              disabled={isGenerating || !apiKey.trim()}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: "#10b981" }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating deck...
                </>
              ) : (
                <>
                  <Layers size={20} />
                  Generate Flashcard Deck
                </>
              )}
            </button>
          </section>
        )}

        {/* Step 3: Interactive Study Area */}
        {flashcards.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-300 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-center">
                  3
                </span>
                Flashcards Deck
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                Card {currentCardIndex + 1} of {flashcards.length}
              </span>
            </div>

            {/* Flashcard Component */}
            <div className="h-64 relative perspective-1000 select-none cursor-pointer">
              <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .card-inner { transition: transform 0.6s; transform-style: preserve-3d; }
                .flipped { transform: rotateY(180deg); }
                .card-face { backface-visibility: hidden; position: absolute; inset: 0; }
                .card-back { transform: rotateY(180deg); }
              `}</style>
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`card-inner w-full h-full rounded-2xl border border-white/10 bg-white/5 shadow-2xl flex flex-center ${
                  isFlipped ? "flipped" : ""
                }`}
              >
                {/* Front Side */}
                <div className="card-face w-full h-full p-8 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-4 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Question / Concept
                  </span>
                  <p className="text-lg md:text-xl font-bold leading-relaxed text-white max-w-lg">
                    {flashcards[currentCardIndex].front}
                  </p>
                  <span className="text-[10px] text-gray-500 mt-6 flex items-center gap-1.5">
                    <RotateCw size={10} /> Click to flip
                  </span>
                </div>

                {/* Back Side */}
                <div className="card-face card-back w-full h-full p-8 bg-emerald-950/20 border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-4 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    Answer / Definition
                  </span>
                  <p className="text-base md:text-lg leading-relaxed text-gray-200 max-w-lg">
                    {flashcards[currentCardIndex].back}
                  </p>
                  <span className="text-[10px] text-gray-500 mt-6 flex items-center gap-1.5">
                    <RotateCw size={10} /> Click to show question
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation & Controls */}
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={currentCardIndex === 0}
                className="p-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={() => handleKnownToggle(currentCardIndex)}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                  knownCards[currentCardIndex]
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                    : "border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {knownCards[currentCardIndex] ? "✓ Mastered" : "Mark as Mastered"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentCardIndex === flashcards.length - 1}
                className="p-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Export options */}
            <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={exportToCsv}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Download size={14} /> Export deck to Anki (CSV)
              </button>
              <button
                onClick={exportToJson}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Download size={14} /> Export deck to JSON
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full py-3 text-xs text-gray-500 hover:text-white border border-transparent hover:border-white/10 rounded-xl transition-all"
            >
              Upload another PDF
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
