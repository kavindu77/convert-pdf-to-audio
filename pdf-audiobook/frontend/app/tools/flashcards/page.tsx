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
import { Layers, FileText, X, ChevronLeft, ChevronRight, RotateCw, Download } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface Flashcard {
  front: string;
  back: string;
}

export default function FlashcardsPdfPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState(0);

  // Secure job token tracking states
  const [activeJobToken, setActiveJobToken] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

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

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleExtractText = async () => {
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
      const fileSizeMb = file.size / (1024 * 1024);

      // Perform server-side access check & token creation
      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "flashcards",
        toolName: "PDF to Flashcards",
        fileSizeMb,
        pageCount: count,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsExtracting(false);
        return;
      }

      setActiveJobToken(checkResult.jobToken || null);
      setActiveJobId(checkResult.jobId || null);

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
    } catch (err: any) {
      setError(`Extraction failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!extractedText) return;

    setIsGenerating(true);
    setError(null);
    setFlashcards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      const response = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobToken: activeJobToken,
          jobId: activeJobId,
          fileSizeMb: file ? file.size / (1024 * 1024) : 0,
          pageCount,
          documentText: extractedText,
          count: cardCount,
          difficulty: difficulty,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid format returned by AI.");
      }

      // Sync local tasksUsed cache
      const prevUsed = parseInt(localStorage.getItem("user_tasks_used_today") || "0", 10);
      localStorage.setItem("user_tasks_used_today", String(prevUsed + 1));
      
      // Sync trials count
      const isTrial = localStorage.getItem("user_plan") === "free" || !localStorage.getItem("user_plan");
      if (isTrial) {
        const trialsUsed = parseInt(localStorage.getItem("pro_trials_used") || "0", 10);
        localStorage.setItem("pro_trials_used", String(trialsUsed + 1));
      }
      window.dispatchEvent(new Event("storage"));

      setFlashcards(data);
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
    setActiveJobToken(null);
    setActiveJobId(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ToolPageShell
      slug="flashcards"
      category="ai"
      howItWorksSteps={[
        "Upload the study guide or textbook PDF.",
        "Adjust deck size and difficulty settings.",
        "Generate interactive flashcards and export to study offline."
      ]}
    >
      <ToolHeader
        title="PDF to Flashcards"
        description="Convert any textbook or study guide PDF into interactive study flashcards instantly."
        slug="flashcards"
        minPlan="pro"
        processing="ai"
        output="csv/json"
        taskCost={2}
      />

      {file === null && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox onFileSelect={handleFileSelect} />
          <ToolNotice processing="ai" />
        </div>
      )}

      {file !== null && flashcards.length === 0 && (
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
              <FileText size={32} className="text-[#10b981] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-650 text-xs">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Settings / Process Button */}
          <div className="space-y-4">
            {!extractedText ? (
              isExtracting ? (
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
                  onClick={handleExtractText}
                  label="Prepare PDF Text"
                  icon={<FileText size={15} />}
                />
              )
            ) : (
              <>
                <ToolOptionsPanel title="Flashcards Settings">
                  {/* Card count slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Number of Cards</label>
                      <span className="text-xs font-bold text-slate-700">{cardCount}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={cardCount}
                      onChange={(e) => setCardCount(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-slate-200"
                    />
                    <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                      <span>5</span>
                      <span>15</span>
                      <span>30</span>
                    </div>
                  </div>

                  {/* Difficulty level selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Difficulty</label>
                    <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px]">
                      {(["basic", "intermediate", "advanced"] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer capitalize ${
                            difficulty === diff ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                </ToolOptionsPanel>

                {isGenerating ? (
                  <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-sm space-y-2 text-center animate-in">
                    <p className="text-xs font-bold text-indigo-650 animate-pulse">Generating Flashcards...</p>
                  </div>
                ) : (
                  <ToolActionButton
                    onClick={handleGenerateCards}
                    label="Generate Deck"
                    icon={<Layers size={15} />}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {flashcards.length > 0 && (
        <div className="w-full">
          <ToolResultPanel
            title="Flashcards Generated Successfully!"
            subTitle={`Created ${flashcards.length} cards · Level: ${difficulty}`}
            onReset={handleReset}
            resetLabel="Generate another deck"
          >
            <div className="w-full space-y-6">
              <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                <span>CARD {currentCardIndex + 1} OF {flashcards.length}</span>
                {knownCards[currentCardIndex] && <span className="text-emerald-600">✓ MASTERED</span>}
              </div>

              {/* 3D Flip Card */}
              <div className="h-64 relative select-none cursor-pointer" style={{ perspective: "1000px" }}>
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full h-full rounded-2xl border border-slate-200/85 bg-white shadow-sm relative transition-all duration-300"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front Side */}
                  <div
                    className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-white rounded-2xl"
                    style={{
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-extrabold mb-4 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/15">
                      Question / Concept
                    </span>
                    <p className="text-base md:text-lg font-bold leading-relaxed text-slate-800 max-w-lg">
                      {flashcards[currentCardIndex].front}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold mt-6 flex items-center gap-1.5">
                      <RotateCw size={11} /> Click to flip
                    </span>
                  </div>

                  {/* Back Side */}
                  <div
                    className="absolute inset-0 p-6 bg-emerald-50/20 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-extrabold mb-4 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/25">
                      Answer / Definition
                    </span>
                    <p className="text-sm md:text-base leading-relaxed text-slate-700 font-medium max-w-lg">
                      {flashcards[currentCardIndex].back}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold mt-6 flex items-center gap-1.5">
                      <RotateCw size={11} /> Click to show question
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Navigation */}
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={handlePrev}
                  disabled={currentCardIndex === 0}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  onClick={() => handleKnownToggle(currentCardIndex)}
                  className={`px-5 py-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    knownCards[currentCardIndex]
                      ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-600 hover:bg-emerald-500/15"
                      : "border-slate-200 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  {knownCards[currentCardIndex] ? "✓ Mastered" : "Mark as Mastered"}
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentCardIndex === flashcards.length - 1}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-transparent cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Exports */}
              <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={exportToCsv}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 flex items-center justify-center gap-2 text-xs font-bold bg-white shadow-sm transition-all cursor-pointer"
                >
                  <Download size={14} /> Export to Anki (CSV)
                </button>
                <button
                  onClick={exportToJson}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 flex items-center justify-center gap-2 text-xs font-bold bg-white shadow-sm transition-all cursor-pointer"
                >
                  <Download size={14} /> Export to JSON
                </button>
              </div>
            </div>
          </ToolResultPanel>
        </div>
      )}
    </ToolPageShell>
  );
}
