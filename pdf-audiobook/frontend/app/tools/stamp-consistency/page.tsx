"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Stamp,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface PageStampAudit {
  pageNumber: number;
  hasStamp: boolean;
}

export default function StampConsistency() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requiredStamp, setRequiredStamp] = useState<string>("Approved");
  const [customStampText, setCustomStampText] = useState<string>("");
  const [auditResults, setAuditResults] = useState<PageStampAudit[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setAuditResults([]);
    setDownloadUrl(null);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const checkStampConsistency = async () => {
    if (!file || !pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);
    setProgress(0);

    const query = requiredStamp === "Custom" ? customStampText : requiredStamp;
    if (!query.trim()) {
      setError("Please specify the required stamp text.");
      setIsProcessing(false);
      return;
    }

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const results: PageStampAudit[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 100));
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(" ");

        // Case-insensitive exact word search
        const hasStamp = new RegExp("\\b" + query + "\\b", "i").test(text);
        results.push({ pageNumber: i, hasStamp });
      }

      setAuditResults(results);
    } catch (err: any) {
      setError(`Stamp check failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addMissingStamps = async () => {
    if (!pdfBytes || auditResults.length === 0) return;

    setIsProcessing(true);
    setProgress(50);

    const query = requiredStamp === "Custom" ? customStampText : requiredStamp;

    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      auditResults.forEach((res) => {
        // If stamp is missing on this page, stamp it
        if (!res.hasStamp) {
          const pageIdx = res.pageNumber - 1;
          const page = pages[pageIdx];
          const { width, height } = page.getSize();

          // Draw a stamp at top-right corner
          const stampWidth = 140;
          const stampHeight = 40;
          const x = width - stampWidth - 25;
          const y = height - stampHeight - 25;

          // Border rectangle
          page.drawRectangle({
            x,
            y,
            width: stampWidth,
            height: stampHeight,
            borderColor: rgb(0.9, 0.1, 0.1), // red
            borderWidth: 2,
            opacity: 0.8,
            rotate: { angle: -8, x: x + (stampWidth/2), y: y + (stampHeight/2) } as any,
          });

          // Text inside rectangle
          const text = query.toUpperCase();
          const fontSize = 12;
          const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
          
          page.drawText(text, {
            x: x + (stampWidth - textWidth) / 2,
            y: y + (stampHeight - fontSize) / 2 - 1.5,
            size: fontSize,
            font: helveticaBold,
            color: rgb(0.9, 0.1, 0.1),
            opacity: 0.8,
            rotate: { angle: -8, x: x + (stampWidth/2), y: y + (stampHeight/2) } as any,
          });
        }
      });

      const stampedBytes = await pdfDoc.save();
      const blob = new Blob([stampedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setDownloadUrl(URL.createObjectURL(blob));
      
      // Update local state to reflect additions
      setAuditResults(prev => prev.map(r => ({ ...r, hasStamp: true })));
      setProgress(100);
    } catch (err: any) {
      setError(`Failed to apply stamps: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Stamp size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">DocuSafe PDF</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center animate-pulse">
              <Stamp size={20} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Stamp Consistency Checker</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Check if every page has required status stamps like “Approved,” “Paid,” or “Confidential.” Auto-applies red text stamps onto flagged pages with one click.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-gray-500 mb-4 animate-pulse" size={36} />
              <p className="text-sm text-white font-medium">Click or drag PDF here</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 text-purple-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setAuditResults([]);
                  setDownloadUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        {/* Configurations */}
        {file && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center font-bold">2</span>
              Required Stamp settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold">Required Stamp Keyword</label>
                <select
                  value={requiredStamp}
                  onChange={(e) => setRequiredStamp(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white"
                >
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Draft">Draft</option>
                  <option value="Custom">Custom Text...</option>
                </select>
              </div>

              {requiredStamp === "Custom" && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold">Custom Stamp Text</label>
                  <input
                    type="text"
                    placeholder="e.g. AUDITED"
                    value={customStampText}
                    onChange={(e) => setCustomStampText(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-purple-500 text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
              {auditResults.length > 0 && auditResults.some(r => !r.hasStamp) && !downloadUrl && (
                <button
                  onClick={addMissingStamps}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  Apply Stamps to Missing Pages
                </button>
              )}

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_stamped.pdf` : "stamped.pdf"}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={14} /> Download Stamped PDF
                </a>
              )}
              
              <button
                onClick={checkStampConsistency}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Auditing...
                  </>
                ) : (
                  "Run Stamp Audit"
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Auditing text layer...</span>
                  <span className="text-purple-400 font-semibold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
                {error}
              </p>
            )}
          </section>
        )}

        {/* Audit Report */}
        {auditResults.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-white text-lg">Stamp Consistency Audit List</h2>
            
            {auditResults.every((r) => r.hasStamp) ? (
              <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center gap-3 text-xs">
                <CheckCircle2 size={16} className="text-green-400" />
                All pages are consistently stamped with &ldquo;{requiredStamp === "Custom" ? customStampText : requiredStamp}&rdquo;!
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex gap-3 items-center">
                  <AlertTriangle className="text-red-400 shrink-0" size={16} />
                  <p>
                    Detected <strong>{auditResults.filter(r => !r.hasStamp).length} pages</strong> missing the required stamp.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {auditResults.map((r) => (
                    <div
                      key={r.pageNumber}
                      className={`p-3 rounded-xl border text-center text-xs ${
                        r.hasStamp
                          ? "bg-green-500/5 border-green-500/20 text-green-400"
                          : "bg-red-500/5 border-red-500/20 text-red-400"
                      }`}
                    >
                      <p className="font-semibold">Page {r.pageNumber}</p>
                      <p className="text-[10px] mt-1 font-bold">
                        {r.hasStamp ? "STAMP PRESENT" : "MISSING STAMP"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
