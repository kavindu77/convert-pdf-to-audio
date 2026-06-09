"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Link2,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ExtractedLink {
  url: string;
  cleanUrl: string;
  page: number;
  status: "safe" | "tracking" | "shortener" | "suspicious";
  details: string;
}

export default function LinkSafetyScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<ExtractedLink[]>([]);
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
    setLinks([]);
    setSanitizedUrl(null);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const analyzeLinks = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setLinks([]);
    setSanitizedUrl(null);
    setProgress(20);

    try {
      const { PDFDocument, PDFName, PDFDict, PDFArray, PDFString } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      const foundLinks: ExtractedLink[] = [];

      for (let idx = 0; idx < pages.length; idx++) {
        setProgress(20 + Math.round((idx / pages.length) * 60));
        const page = pages[idx];

        if (page.node.has(PDFName.of("Annots"))) {
          const annots = page.node.get(PDFName.of("Annots"));
          const resolvedAnnots = pdfDoc.context.lookup(annots);

          if (resolvedAnnots instanceof PDFArray) {
            for (let aIdx = 0; aIdx < resolvedAnnots.size(); aIdx++) {
              const annot = pdfDoc.context.lookup(resolvedAnnots.get(aIdx));
              
              if (annot instanceof PDFDict && annot.has(PDFName.of("A"))) {
                const action = pdfDoc.context.lookup(annot.get(PDFName.of("A")));
                
                if (action instanceof PDFDict && action.has(PDFName.of("URI"))) {
                  const uriObj = pdfDoc.context.lookup(action.get(PDFName.of("URI")));
                  if (uriObj) {
                    const rawUrl = uriObj.toString().replace(/^\(/, "").replace(/\)$/, "");
                    
                    // Clean URL by stripping tracking parameters (e.g. utm_*)
                    let cleanUrl = rawUrl;
                    let status: "safe" | "tracking" | "shortener" | "suspicious" = "safe";
                    let details = "No security issues detected.";

                    try {
                      const parsed = new URL(rawUrl);
                      const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
                      const hasTracking = trackingParams.some(param => parsed.searchParams.has(param));

                      if (hasTracking) {
                        status = "tracking";
                        details = "Contains marketing tracking tokens (e.g., utm_source).";
                        trackingParams.forEach(param => parsed.searchParams.delete(param));
                        cleanUrl = parsed.toString();
                      }

                      // Check for URL shorteners
                      const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];
                      if (shorteners.some(domain => parsed.hostname.includes(domain))) {
                        status = "shortener";
                        details = "Uses a URL shortener service which hides the true destination.";
                      }
                    } catch {
                      // Invalid URL structure
                      status = "suspicious";
                      details = "Invalid URL schema or suspicious syntax structure.";
                    }

                    foundLinks.push({
                      url: rawUrl,
                      cleanUrl,
                      page: idx + 1,
                      status,
                      details,
                    });
                  }
                }
              }
            }
          }
        }
      }

      setLinks(foundLinks);
      setProgress(100);
    } catch (err: any) {
      setError(`Link safety scan failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sanitizeUrls = async () => {
    if (!pdfBytes || links.length === 0) return;

    setIsProcessing(true);
    setProgress(50);

    try {
      const { PDFDocument, PDFName, PDFDict, PDFArray, PDFString } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (let idx = 0; idx < pages.length; idx++) {
        const page = pages[idx];

        if (page.node.has(PDFName.of("Annots"))) {
          const annots = page.node.get(PDFName.of("Annots"));
          const resolvedAnnots = pdfDoc.context.lookup(annots);

          if (resolvedAnnots instanceof PDFArray) {
            for (let aIdx = 0; aIdx < resolvedAnnots.size(); aIdx++) {
              const annot = pdfDoc.context.lookup(resolvedAnnots.get(aIdx));
              
              if (annot instanceof PDFDict && annot.has(PDFName.of("A"))) {
                const action = pdfDoc.context.lookup(annot.get(PDFName.of("A")));
                
                if (action instanceof PDFDict && action.has(PDFName.of("URI"))) {
                  const uriObj = pdfDoc.context.lookup(action.get(PDFName.of("URI")));
                  if (uriObj) {
                    const rawUrl = uriObj.toString().replace(/^\(/, "").replace(/\)$/, "");

                    // Find clean URL counterpart
                    const match = links.find(l => l.url === rawUrl && l.page === idx + 1);
                    if (match && match.status === "tracking") {
                      // Update the URI value
                      action.set(PDFName.of("URI"), PDFString.of(match.cleanUrl));
                    }
                  }
                }
              }
            }
          }
        }
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setSanitizedUrl(URL.createObjectURL(blob));
      
      // Update links state to all safe/cleaned
      setLinks(prev => prev.map(l => l.status === "tracking" ? { ...l, status: "safe", url: l.cleanUrl, details: "Tracking parameters stripped." } : l));
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
            <Link2 size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
              <Link2 size={20} className="text-rose-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Link Safety Scanner</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Extracts all hyperlink annotations in your document. Detects marketing trackers (utm_*), suspicious URL shorteners, or broken domains and allows cleaning them instantly.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-rose-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center border border-rose-500/20 text-rose-400">
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
                  setLinks([]);
                  setSanitizedUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && links.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={analyzeLinks}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Audit Links
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-rose-400" />
              <p className="text-xs text-gray-400 font-medium">Inspecting annotation links...</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {links.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">Hyperlink Audit</h2>
              {links.some(l => l.status === "tracking") && !sanitizedUrl && (
                <button
                  onClick={sanitizeUrls}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  Strip Tracking parameters
                </button>
              )}

              {sanitizedUrl && (
                <a
                  href={sanitizedUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_cleaned_links.pdf` : "cleaned_links.pdf"}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={14} /> Download Clean PDF
                </a>
              )}
            </div>

            <div className="space-y-3">
              {links.map((link, idx) => (
                <div key={idx} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-400 font-mono">Page {link.page}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border uppercase ${
                        link.status === "safe"
                          ? "bg-green-500/10 border-green-500/25 text-green-400"
                          : link.status === "tracking"
                          ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                          : "bg-red-500/10 border-red-500/25 text-red-400"
                      }`}>
                        {link.status}
                      </span>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-white/5 font-mono text-[10px] text-gray-300 break-all select-all mt-1.5">
                      {link.url}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-500">{link.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
