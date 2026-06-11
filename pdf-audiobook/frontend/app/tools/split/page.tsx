"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { verifyUsageAndGetToken, recordUsageSuccess } from "@/app/utils/usageClient";
import ToolPageShell from "@/app/components/tools/ToolPageShell";
import ToolHeader from "@/app/components/tools/ToolHeader";
import ToolUploadBox from "@/app/components/tools/ToolUploadBox";
import ToolResultPanel from "@/app/components/tools/ToolResultPanel";
import ToolNotice from "@/app/components/tools/ToolNotice";
import ToolActionButton from "@/app/components/tools/ToolActionButton";
import ToolOptionsPanel from "@/app/components/tools/ToolOptionsPanel";
import { Scissors, FileText, X } from "lucide-react";

type SplitMode = "every-page" | "custom-ranges";

interface SplitResult {
  fileName: string;
  pageLabel: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseRanges(input: string, totalPages: number): number[][] {
  const groups: number[][] = [];
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < 1 || end < start || end > totalPages) {
        throw new Error(`Invalid range "${part}". Pages must be between 1 and ${totalPages}.`);
      }
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i);
      groups.push(pages);
    } else if (/^\d+$/.test(part)) {
      const page = parseInt(part, 10);
      if (page < 1 || page > totalPages) {
        throw new Error(`Page ${page} is out of range. PDF has ${totalPages} pages.`);
      }
      groups.push([page]);
    } else {
      throw new Error(`Cannot parse "${part}". Use formats like "1-3, 5, 7-10".`);
    }
  }

  if (groups.length === 0) {
    throw new Error("Please enter at least one page or range.");
  }

  return groups;
}

export default function SplitPdfPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const [splitMode, setSplitMode] = useState<SplitMode>("every-page");
  const [rangeInput, setRangeInput] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[] | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100 MB.");
      return;
    }

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();

      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(count);
    } catch {
      setError("Failed to read PDF. The file may be corrupted or password-protected.");
    }
  }, []);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      loadFile(files[0]);
    }
  };

  const handleSplit = async () => {
    if (!file || !pdfBytes || totalPages === 0) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);
    setZipBlob(null);
    setProgress(0);

    try {
      const checkResult = await verifyUsageAndGetToken({
        toolSlug: "split",
        toolName: "Split PDF",
        fileSizeMb: file.size / (1024 * 1024),
        pageCount: totalPages,
        fileCount: 1,
      });

      if (!checkResult.allowed) {
        setIsProcessing(false);
        return;
      }

      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;

      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      let pageGroups: number[][];
      if (splitMode === "every-page") {
        pageGroups = Array.from({ length: totalPages }, (_, i) => [i + 1]);
      } else {
        pageGroups = parseRanges(rangeInput, totalPages);
      }

      const zip = new JSZip();
      const splitResults: SplitResult[] = [];
      let totalBytes = 0;

      for (let i = 0; i < pageGroups.length; i++) {
        const group = pageGroups[i];
        const newPdf = await PDFDocument.create();
        const indices = group.map((p) => p - 1);
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const pdfData = await newPdf.save();
        const pageLabel =
          group.length === 1
            ? `page-${group[0]}`
            : `pages-${group[0]}-${group[group.length - 1]}`;
        const fileName = `${(file?.name || "document").replace(/\.pdf$/i, "")}_${pageLabel}.pdf`;

        zip.file(fileName, pdfData);
        splitResults.push({
          fileName,
          pageLabel: group.length === 1 ? `Page ${group[0]}` : `Pages ${group[0]}–${group[group.length - 1]}`,
          size: pdfData.length,
        });
        totalBytes += pdfData.length;

        setProgress(Math.round(((i + 1) / pageGroups.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });

      const recordSuccess = await recordUsageSuccess({
        jobToken: checkResult.jobToken!,
        jobId: checkResult.jobId!,
        toolSlug: "split",
        fileSizeMb: file.size / (1024 * 1024),
        pageCount: totalPages,
        fileCount: 1,
      });

      if (!recordSuccess) {
        throw new Error("Failed to record usage event. Please try again.");
      }

      const prevUsed = parseInt(localStorage.getItem("user_tasks_used_today") || "0", 10);
      localStorage.setItem("user_tasks_used_today", String(prevUsed + (checkResult.taskCost || 1)));
      window.dispatchEvent(new Event("storage"));

      setZipBlob(blob);
      setResults(splitResults);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred while splitting the PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(file?.name || "document").replace(/\.pdf$/i, "")}_split.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setTotalPages(0);
    setSplitMode("every-page");
    setRangeInput("");
    setResults(null);
    setZipBlob(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ToolPageShell
      slug="split"
      category="popular"
      howItWorksSteps={[
        "Upload your PDF file.",
        "Choose to split every page or enter custom page ranges.",
        "Click Split PDF and download your ZIP file containing the separate pages."
      ]}
    >
      <ToolHeader
        title="Split PDF"
        description="Split a PDF into individual pages or custom ranges."
        slug="split"
        minPlan="free"
        processing="client"
        output="zip"
        taskCost={1}
      />

      {file === null && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <ToolUploadBox onFileSelect={handleFileSelect} />
          <ToolNotice processing="client" />
        </div>
      )}

      {file !== null && !results && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Panel: Selected File Display */}
          <div className="md:col-span-2 bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Selected PDF File</h3>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-red-50 hover:text-red-650 rounded-xl text-xs font-bold text-slate-500 transition-all border border-slate-200/50"
              >
                <X size={12} /> Clear
              </button>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 max-w-xl mx-auto w-full">
              <FileText size={32} className="text-indigo-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(file.size)} · {totalPages} pages</p>
              </div>
            </div>

            {splitMode === "custom-ranges" && (
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px] text-slate-500 leading-normal max-w-xl mx-auto">
                <span className="font-bold text-slate-800">Custom Range Syntax:</span> Enter page numbers separated by commas (e.g. 1, 3, 5) or ranges (e.g. 2-4, 6-9).
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                <X size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Settings and Trigger */}
          <div className="space-y-4">
            <ToolOptionsPanel title="Split Settings">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Split Mode</label>
                <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 border border-slate-250/50 rounded-xl text-[10px]">
                  <button
                    onClick={() => setSplitMode("every-page")}
                    className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                      splitMode === "every-page" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                    }`}
                  >
                    Split All Pages
                  </button>
                  <button
                    onClick={() => setSplitMode("custom-ranges")}
                    className={`py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                      splitMode === "custom-ranges" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 bg-transparent"
                    }`}
                  >
                    Custom Ranges
                  </button>
                </div>
              </div>

              {splitMode === "custom-ranges" && (
                <div className="space-y-1.5 animate-in">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Enter Ranges</label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500/50 text-slate-850"
                  />
                </div>
              )}
            </ToolOptionsPanel>

            {isProcessing ? (
              <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-sm space-y-2.5 animate-in">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Processing...</span>
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
                onClick={handleSplit}
                disabled={splitMode === "custom-ranges" && !rangeInput.trim()}
                label="Split PDF"
                icon={<Scissors size={15} />}
              />
            )}
          </div>
        </div>
      )}

      {results && (
        <div className="w-full">
          <ToolResultPanel
            title="Split Successful!"
            subTitle={`Extracted ${results.length} documents.`}
            onDownload={handleDownload}
            downloadLabel="Download ZIP Archive"
            onReset={handleReset}
            resetLabel="Split another PDF"
          />
        </div>
      )}
    </ToolPageShell>
  );
}
