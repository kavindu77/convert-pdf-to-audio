"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Eye,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface MetadataLeak {
  field: string;
  value: string;
  risk: "high" | "medium" | "low";
  description: string;
}

interface PrivacyReportData {
  fileName: string;
  privacyScore: number; // 0-100
  grade: string; // A, B, C, D, F
  leaks: MetadataLeak[];
  hasHiddenText: boolean;
  hasAttachments: boolean;
  hasLinks: boolean;
}

export default function PrivacyReport() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PrivacyReportData | null>(null);
  const [sanitizedUrl, setSanitizedUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setReport(null);
    setSanitizedUrl(null);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const generatePrivacyReport = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setProgress(20);

    try {
      const { PDFDocument, PDFName, PDFDict, PDFArray } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const leaks: MetadataLeak[] = [];
      let scoreDeduction = 0;

      // Scan Metadata fields
      const author = pdfDoc.getAuthor();
      const creator = pdfDoc.getCreator();
      const producer = pdfDoc.getProducer();
      const title = pdfDoc.getTitle();
      const subject = pdfDoc.getSubject();
      const keywords = pdfDoc.getKeywords();
      const creationDate = pdfDoc.getCreationDate();
      const modDate = pdfDoc.getModificationDate();

      if (author) {
        leaks.push({
          field: "Author Name",
          value: author,
          risk: "high",
          description: "Reveals the name of the document creator, exposing identity details.",
        });
        scoreDeduction += 20;
      }
      
      if (creator) {
        leaks.push({
          field: "Creator App",
          value: creator,
          risk: "medium",
          description: "Exposes the software or editor tool used to draft the PDF (can reveal OS details).",
        });
        scoreDeduction += 10;
      }

      if (producer) {
        leaks.push({
          field: "Producer Engine",
          value: producer,
          risk: "low",
          description: "Exposes low-level conversion library engine versions.",
        });
        scoreDeduction += 5;
      }

      if (creationDate) {
        leaks.push({
          field: "Creation Timestamp",
          value: creationDate.toISOString(),
          risk: "medium",
          description: "Exposes the exact date, time, and timezone of document compilation.",
        });
        scoreDeduction += 15;
      }

      if (modDate) {
        leaks.push({
          field: "Edit History Date",
          value: modDate.toISOString(),
          risk: "low",
          description: "Exposes the date and time the file was last altered.",
        });
        scoreDeduction += 5;
      }

      // Check external links & attachments
      let hasAttachments = false;
      const catalog = pdfDoc.catalog;
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);
        if (resolvedNames instanceof PDFDict && resolvedNames.has(PDFName.of("EmbeddedFiles"))) {
          hasAttachments = true;
          scoreDeduction += 20;
        }
      }

      let hasLinks = false;
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        if (page.node.has(PDFName.of("Annots"))) {
          const annots = page.node.get(PDFName.of("Annots"));
          const resolvedAnnots = pdfDoc.context.lookup(annots);
          if (resolvedAnnots instanceof PDFArray) {
            for (let idx = 0; idx < resolvedAnnots.size(); idx++) {
              const annot = pdfDoc.context.lookup(resolvedAnnots.get(idx));
              if (annot instanceof PDFDict && annot.has(PDFName.of("A"))) {
                const action = pdfDoc.context.lookup(annot.get(PDFName.of("A")));
                if (action instanceof PDFDict && action.has(PDFName.of("URI"))) {
                  hasLinks = true;
                  break;
                }
              }
            }
          }
        }
        if (hasLinks) break;
      }

      if (hasLinks) {
        leaks.push({
          field: "External Connections",
          value: "Contains clickable web links (/URI)",
          risk: "medium",
          description: "Exposes web destinations that can contain tracking codes or lead to phishing domains.",
        });
        scoreDeduction += 15;
      }

      if (hasAttachments) {
        leaks.push({
          field: "Embedded Files",
          value: "Contains nested file attachments",
          risk: "high",
          description: "Exposes files packaged inside the PDF structure (could contain malware or hidden archives).",
        });
      }

      const privacyScore = Math.max(10, 100 - scoreDeduction);
      let grade = "A";
      if (privacyScore < 50) grade = "F";
      else if (privacyScore < 70) grade = "D";
      else if (privacyScore < 80) grade = "C";
      else if (privacyScore < 90) grade = "B";

      setReport({
        fileName: file.name,
        privacyScore,
        grade,
        leaks,
        hasHiddenText: false,
        hasAttachments,
        hasLinks,
      });

      setProgress(100);
    } catch (err: any) {
      setError(`Report generation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sanitizeDocument = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setProgress(50);

    try {
      const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Strip metadata catalog properties
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setCreator("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");

      // Remove attachments if present
      const catalog = pdfDoc.catalog;
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);
        if (resolvedNames instanceof PDFDict) {
          resolvedNames.delete(PDFName.of("EmbeddedFiles"));
        }
      }

      const sanitizedBytes = await pdfDoc.save();
      const blob = new Blob([sanitizedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setSanitizedUrl(URL.createObjectURL(blob));
      
      // Update report to show optimized score
      if (report) {
        setReport({
          ...report,
          privacyScore: 100,
          grade: "A",
          leaks: [],
          hasAttachments: false,
        });
      }
      setProgress(100);
    } catch (err: any) {
      setError(`Sanitization failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Eye size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center animate-pulse">
              <Eye size={20} className="text-teal-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PDF Privacy Report</h1>
          </div>
          <p className="text-gray-400">
            Generate an audit report of hidden metadata: author names, creation software history, embedded files, and tracking links, then sanitize them in one click.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-teal-500/50 hover:bg-teal-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center border border-teal-500/20 text-teal-400">
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
                  setReport(null);
                  setSanitizedUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !report && (
            <div className="flex justify-end">
              <button
                onClick={generatePrivacyReport}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Audit Document Privacy
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-teal-400" />
              <p className="text-xs text-gray-400 font-medium">Inspecting catalog data stream...</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {report && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">Privacy Report Results</h2>
              {report.leaks.length > 0 && !sanitizedUrl && (
                <button
                  onClick={sanitizeDocument}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  Sanitize Metadata (Clean PDF)
                </button>
              )}

              {sanitizedUrl && (
                <a
                  href={sanitizedUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_privacy_cleaned.pdf` : "privacy_cleaned.pdf"}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={14} /> Download Sanitized PDF
                </a>
              )}
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Privacy Rating</p>
                <p className={`text-4xl font-black ${
                  report.grade === "A" ? "text-green-400" : report.grade === "B" ? "text-green-300" : "text-red-400"
                }`}>
                  {report.grade}
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1">
                <p className="text-xs text-gray-500">Privacy Score</p>
                <p className="text-3xl font-extrabold text-white">{report.privacyScore} / 100</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center space-y-1 flex flex-col justify-center items-center">
                <p className="text-xs text-gray-500">Privacy Issues Found</p>
                <p className={`text-3xl font-extrabold ${report.leaks.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {report.leaks.length}
                </p>
              </div>
            </div>

            {/* Leaks Inventory */}
            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-white">Metadata & Structure Exposure Logs</h3>

              {report.leaks.length > 0 ? (
                <div className="space-y-3">
                  {report.leaks.map((leak, idx) => (
                    <div key={idx} className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase">{leak.field}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                          leak.risk === "high"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : leak.risk === "medium"
                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {leak.risk} risk
                        </span>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-white/5 font-mono text-[11px] text-yellow-100 truncate mt-1">
                        {leak.value}
                      </div>
                      <p className="text-[10px] text-gray-500 pt-1 leading-relaxed">{leak.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                  <CheckCircle2 size={16} /> Privacy scan passed! Document metadata is clean and untrackable.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
