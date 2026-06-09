"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Paperclip,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  Trash2,
} from "lucide-react";

interface PDFAttachment {
  name: string;
  size: number;
  data: Uint8Array;
}

export default function AttachmentInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PDFAttachment[]>([]);
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
    setAttachments([]);
    setSanitizedUrl(null);
    
    try {
      const buffer = await f.arrayBuffer();
      setPdfBytes(buffer);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const inspectAttachments = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setProgress(20);
    setProgressLabel("Loading PDF catalogue tree...");

    try {
      const { PDFDocument, PDFName, PDFDict, PDFArray } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const catalog = pdfDoc.catalog;
      
      const found: PDFAttachment[] = [];

      setProgress(50);
      setProgressLabel("Searching /EmbeddedFiles in catalog...");

      // PDF structure inspection for attachments:
      // Catalog -> Names -> EmbeddedFiles -> Names [Name1, Ref1, Name2, Ref2...]
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);
        
        if (resolvedNames instanceof PDFDict && resolvedNames.has(PDFName.of("EmbeddedFiles"))) {
          const embFilesDict = resolvedNames.get(PDFName.of("EmbeddedFiles"));
          const resolvedEmbFiles = pdfDoc.context.lookup(embFilesDict);

          if (resolvedEmbFiles instanceof PDFDict && resolvedEmbFiles.has(PDFName.of("Names"))) {
            const namesArray = resolvedEmbFiles.get(PDFName.of("Names"));
            const resolvedNamesArray = pdfDoc.context.lookup(namesArray);

            if (resolvedNamesArray instanceof PDFArray) {
              const arraySize = resolvedNamesArray.size();
              
              for (let idx = 0; idx < arraySize; idx += 2) {
                // Name string is even index, FileSpec dictionary ref is odd index
                const nameObj = resolvedNamesArray.get(idx);
                const fileSpecRef = resolvedNamesArray.get(idx + 1);

                const nameStr = nameObj.toString().replace(/^\(/, "").replace(/\)$/, "");
                const fileSpec = pdfDoc.context.lookup(fileSpecRef);

                if (fileSpec instanceof PDFDict && fileSpec.has(PDFName.of("EF"))) {
                  const efDict = fileSpec.get(PDFName.of("EF"));
                  const resolvedEf = pdfDoc.context.lookup(efDict);

                  if (resolvedEf instanceof PDFDict && resolvedEf.has(PDFName.of("F"))) {
                    const fileStreamRef = resolvedEf.get(PDFName.of("F"));
                    const fileStreamObj = pdfDoc.context.lookup(fileStreamRef) as any;

                    if (fileStreamObj && fileStreamObj.contents) {
                      const streamBytes = fileStreamObj.contents;
                      found.push({
                        name: nameStr,
                        size: streamBytes.length,
                        data: streamBytes,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      setAttachments(found);
      setProgress(100);
      setProgressLabel("Completed!");
    } catch (err: any) {
      setError(`Attachment inspection failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeAttachments = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setProgress(50);
    setProgressLabel("Stripping embedded files dictionary...");

    try {
      const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const catalog = pdfDoc.catalog;

      // Strip EmbeddedFiles entries from Catalog Name dictionary
      if (catalog.has(PDFName.of("Names"))) {
        const namesDict = catalog.get(PDFName.of("Names"));
        const resolvedNames = pdfDoc.context.lookup(namesDict);

        if (resolvedNames instanceof PDFDict) {
          resolvedNames.delete(PDFName.of("EmbeddedFiles"));
        }
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setSanitizedUrl(URL.createObjectURL(blob));
      setProgress(100);
      setProgressLabel("Sanitized successfully!");
    } catch (err: any) {
      setError(`Failed to strip attachments: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAttachment = (att: PDFAttachment) => {
    const blob = new Blob([att.data.buffer as ArrayBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = att.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Paperclip size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Paperclip size={20} className="text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Attachment Inspector</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Inspect embedded files hidden inside the PDF catalogue envelope. Extract attachments or completely strip them to secure document delivery.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 text-indigo-400">
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
                  setAttachments([]);
                  setSanitizedUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && attachments.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={inspectAttachments}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Inspect Attachments
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
              <p className="text-xs text-gray-400 font-medium">{progressLabel}</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {file && !isProcessing && (
          <section className="space-y-6 animate-fade-in">
            {attachments.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white text-lg">Detected Embedded Attachments ({attachments.length})</h2>
                  {!sanitizedUrl && (
                    <button
                      onClick={removeAttachments}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={14} /> Remove All Attachments
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Paperclip size={18} className="text-indigo-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">{att.name}</p>
                          <p className="text-[10px] text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadAttachment(att)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download size={12} /> Extract
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              file && attachments.length === 0 && progress === 100 && (
                <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center gap-3 text-xs">
                  <CheckCircle2 size={16} className="text-green-400" />
                  No embedded attachments or hidden container files found. This document is clean!
                </div>
              )
            )}

            {sanitizedUrl && (
              <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-400" />
                  Sanitized PDF Generated!
                </h3>
                <p className="text-xs text-gray-300 font-normal">
                  All embedded file attachments have been successfully deleted from the catalog.
                </p>
                <div className="pt-2 flex justify-end">
                  <a
                    href={sanitizedUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_sanitized.pdf` : "sanitized.pdf"}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  >
                    <Download size={16} /> Download Sanitized PDF
                  </a>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
