"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FolderArchive,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
} from "lucide-react";

export default function DeliveryPackager() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setDownloadUrl(null);
    setZipBlob(null);
  }, []);

  const createDeliveryPackage = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Reading PDF file bytes...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");

      const arrayBuffer = await file.arrayBuffer();

      // Step 1: Compute SHA-256 hash of the PDF
      setProgress(20);
      setProgressLabel("Calculating security verification hash...");
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // Step 2: Extract PDF metadata and optimize (Compress PDF logic)
      setProgress(40);
      setProgressLabel("Processing optimized PDF version...");
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Strip metadata from the optimized version
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setCreator("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      const optimizedBytes = await pdfDoc.save();

      // Step 3: Extract Plain Text (Extract Text logic)
      setProgress(60);
      setProgressLabel("Extracting text contents...");
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdfjsDoc.numPages;
      const textParts: string[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        textParts.push(`--- PAGE ${i} ---\n${pageText}\n`);
      }
      const fullText = textParts.join("\n");

      // Step 4: Create Delivery Manifest / Security Report
      setProgress(80);
      setProgressLabel("Compiling metadata manifest...");
      let manifest = `PDF CLIENT DELIVERY REPORT\n`;
      manifest += `============================\n`;
      manifest += `Generated: ${new Date().toLocaleString()}\n`;
      manifest += `Source File Name: ${file.name}\n`;
      manifest += `Original File Size: ${(file.size / 1024).toFixed(1)} KB\n`;
      manifest += `Optimized File Size: ${(optimizedBytes.length / 1024).toFixed(1)} KB\n`;
      manifest += `Total Rendered Pages: ${totalPages}\n`;
      manifest += `SHA-256 Verification Hash: ${hashHex}\n`;
      manifest += `============================\n`;

      // Step 5: ZIP packaging
      setProgress(90);
      setProgressLabel("Generating client ZIP archive...");
      const zip = new JSZip();
      
      const baseName = file.name.replace(".pdf", "");
      zip.file(`${baseName}_optimized.pdf`, optimizedBytes);
      zip.file(`${baseName}_transcript.txt`, fullText);
      zip.file(`${baseName}_manifest.txt`, manifest);

      const content = await zip.generateAsync({ type: "blob" });
      setZipBlob(content);
      const url = URL.createObjectURL(content);
      setDownloadUrl(url);
      
      setProgress(100);
      setProgressLabel("Completed!");
    } catch (err: any) {
      setError(`Failed to create package: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!zipBlob || !file) return;
    const baseName = file.name.replace(".pdf", "");
    const JSZip = require("jszip"); // dynamic safety
    import("file-saver").then(({ saveAs }) => {
      saveAs(zipBlob, `${baseName}_delivery_pack.zip`);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FolderArchive size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
              <FolderArchive size={20} className="text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Client Delivery Packager</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Prepares a client-ready delivery bundle. Packages a stripped-metadata PDF, plain text transcript, and SHA-256 verification report into a ZIP file.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs flex items-center justify-center">1</span>
            Upload PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 text-orange-400">
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
                  setDownloadUrl(null);
                  setZipBlob(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && !downloadUrl && (
            <div className="flex justify-end">
              <button
                onClick={createDeliveryPackage}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Create Delivery Bundle
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-orange-400" />
                  {progressLabel}
                </span>
                <span className="text-orange-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl font-medium">
              {error}
            </p>
          )}

          {downloadUrl && (
            <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                Package Generated!
              </h3>
              <p className="text-xs text-gray-300 font-normal">
                Your client delivery pack has been successfully created. The download includes:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-gray-400 space-y-1">
                <li><strong className="text-white">Optimized PDF:</strong> Clean copy with creator & software metadata stripped.</li>
                <li><strong className="text-white">Transcript TXT:</strong> Plain text extraction of all pages.</li>
                <li><strong className="text-white">Manifest TXT:</strong> SHA-256 verification hash, size stats, and audit records.</li>
              </ul>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={triggerDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={16} /> Download ZIP Package
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
