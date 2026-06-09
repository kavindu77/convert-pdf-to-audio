"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Heading,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";

interface NamingMetadata {
  invoiceNumber: string;
  date: string;
  companyName: string;
  title: string;
}

export default function SmartRename() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<NamingMetadata | null>(null);
  const [customName, setCustomName] = useState<string>("");
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setMetadata(null);
    setCustomName("");
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const scanForNamingMetadata = async () => {
    if (!file || !pdfBytes) return;

    setIsProcessing(true);
    setError(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      
      // We read the first page text which contains invoice header info
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");

      // Regex scans
      // 1. Date finder
      const dateRegex = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i;
      const dateMatch = text.match(dateRegex);
      const foundDate = dateMatch ? dateMatch[0].replace(/[/.]/g, "-") : "";

      // 2. Invoice number finder
      const invRegex = /\b(?:invoice|inv|bill|receipt|receipt#|inv#|invoice#)\b[:#\s]*([a-z0-9-]+)/i;
      const invMatch = text.match(invRegex);
      const foundInv = invMatch && invMatch[1] && invMatch[1].length > 2 ? invMatch[1] : "";

      // 3. Company indicator finder
      const compRegex = /\b([a-z0-9\s,&]+(?:\bInc\b|\bLLC\b|\bCorp\b|\bLtd\b|\bCo\b|\bGroup\b|\bGmbH\b))/i;
      const compMatch = text.match(compRegex);
      const foundComp = compMatch ? compMatch[1].trim() : "";

      // 4. Title / Header estimation
      // We look at the first few lines of text
      const lines = textContent.items
        .map((item: any) => item.str.trim())
        .filter((l: string) => l.length > 3 && l.length < 50);
      const foundTitle = lines.length > 0 ? lines[0] : "Document";

      const meta: NamingMetadata = {
        invoiceNumber: foundInv,
        date: foundDate,
        companyName: foundComp,
        title: foundTitle,
      };

      setMetadata(meta);

      // Construct standard format template name
      // e.g. 2026-06-09_AcmeCorp_Invoice_INV-1029.pdf
      const parts: string[] = [];
      if (foundDate) parts.push(foundDate);
      if (foundComp) parts.push(foundComp.replace(/[\s,]+/g, ""));
      if (foundInv) parts.push(`Inv-${foundInv}`);
      else parts.push(foundTitle.replace(/[\s,]+/g, ""));

      setCustomName(parts.filter(Boolean).join("_") + ".pdf");

    } catch (err: any) {
      setError(`Smart scan failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyNamingTemplate = (type: "invoice" | "date-title" | "simple") => {
    if (!metadata) return;
    const parts: string[] = [];

    if (type === "invoice") {
      if (metadata.date) parts.push(metadata.date);
      if (metadata.companyName) parts.push(metadata.companyName.replace(/[\s,]+/g, ""));
      if (metadata.invoiceNumber) parts.push(`Inv-${metadata.invoiceNumber}`);
    } else if (type === "date-title") {
      if (metadata.date) parts.push(metadata.date);
      if (metadata.title) parts.push(metadata.title.replace(/[\s,]+/g, ""));
    } else {
      if (metadata.title) parts.push(metadata.title.replace(/[\s,]+/g, ""));
    }

    setCustomName(parts.filter(Boolean).join("_") + ".pdf");
  };

  const downloadRenamedPdf = () => {
    if (!pdfBytes || !customName) return;

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = customName.endsWith(".pdf") ? customName : `${customName}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Heading size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <Heading size={20} className="text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Smart Rename</h1>
          </div>
          <p className="text-gray-400">
            Automatically rename your PDFs based on extracted invoice numbers, dates, customer names, or title headers on the first page.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 text-cyan-400">
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
                  setMetadata(null);
                  setCustomName("");
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !metadata && (
            <div className="flex justify-end">
              <button
                onClick={scanForNamingMetadata}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Scan & Rename
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <p className="text-xs text-gray-400 font-medium">Scanning text coordinates...</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Templates Selector */}
        {metadata && (
          <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
              Naming Options
            </h2>

            {/* Scanned stats details */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2.5">
              <p className="font-bold text-gray-300">Scanned Document Indicators:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p><span className="text-gray-500">Invoice ID:</span> <span className="text-yellow-100 font-medium">{metadata.invoiceNumber || "Not found"}</span></p>
                <p><span className="text-gray-500">Company Name:</span> <span className="text-yellow-100 font-medium">{metadata.companyName || "Not found"}</span></p>
                <p><span className="text-gray-500">Date Marker:</span> <span className="text-yellow-100 font-medium">{metadata.date || "Not found"}</span></p>
                <p><span className="text-gray-500">Header Title:</span> <span className="text-yellow-100 font-medium">{metadata.title || "Not found"}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs text-gray-400 font-semibold">Pre-defined Renaming Presets</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => applyNamingTemplate("invoice")}
                  className="p-3 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-white">Invoice Format</p>
                  <p className="text-[10px] text-gray-500 mt-1">Date_Company_InvID.pdf</p>
                </button>
                <button
                  onClick={() => applyNamingTemplate("date-title")}
                  className="p-3 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-white">General Report</p>
                  <p className="text-[10px] text-gray-500 mt-1">Date_Title.pdf</p>
                </button>
                <button
                  onClick={() => applyNamingTemplate("simple")}
                  className="p-3 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-white">Simple Title</p>
                  <p className="text-[10px] text-gray-500 mt-1">Title.pdf</p>
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Proposed File Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-3 bg-gray-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500 text-white font-mono"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={downloadRenamedPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                <Download size={16} /> Save & Download
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
