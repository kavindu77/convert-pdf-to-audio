"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

interface SavedPosition {
  id: string;
  name: string;
  page: number; // 1-indexed
  x: number; // percentage from left
  y: number; // percentage from top
  width: number;
  height: number;
}

interface SignatureTemplate {
  id: string;
  templateName: string;
  positions: SavedPosition[];
}

export default function SignaturePositions() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [currentPositions, setCurrentPositions] = useState<SavedPosition[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [stampedUrl, setStampedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pdf_sig_templates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse signature templates", e);
      }
    }
  }, []);

  const saveTemplatesToDisk = (newTemplates: SignatureTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem("pdf_sig_templates", JSON.stringify(newTemplates));
  };

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    setStampedUrl(null);
    setSignatureImage(null);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      setPdfBytes(arrayBuffer);
      
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
      setFile(f);
      setActivePage(1);
    } catch (err: any) {
      setError(`Failed to read PDF file: ${err.message || err}`);
    }
  }, []);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfBytes || !file || !canvasRef.current) return;
    
    let isMounted = true;
    const renderPage = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(activePage);
        
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (e) {
        console.error("Failed to render page to canvas", e);
      }
    };

    renderPage();
  }, [pdfBytes, file, activePage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const xPct = (clickX / rect.width) * 100;
    const yPct = (clickY / rect.height) * 100;

    const newPos: SavedPosition = {
      id: Math.random().toString(36).substring(7),
      name: `Signer ${currentPositions.length + 1}`,
      page: activePage,
      x: xPct,
      y: yPct,
      width: 120,
      height: 50,
    };

    setCurrentPositions((prev) => [...prev, newPos]);
  };

  const removePosition = (id: string) => {
    setCurrentPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      setError("Please enter a template name.");
      return;
    }
    if (currentPositions.length === 0) {
      setError("Add at least one signature placeholder position on the canvas.");
      return;
    }

    const newTemplate: SignatureTemplate = {
      id: Math.random().toString(36).substring(7),
      templateName: newTemplateName,
      positions: currentPositions,
    };

    const updated = [...templates, newTemplate];
    saveTemplatesToDisk(updated);
    setSelectedTemplateId(newTemplate.id);
    setNewTemplateName("");
    setError(null);
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find((temp) => temp.id === templateId);
    if (t) {
      setCurrentPositions(t.positions);
      setSelectedTemplateId(templateId);
    }
  };

  const deleteTemplate = (templateId: string) => {
    const updated = templates.filter((temp) => temp.id !== templateId);
    saveTemplatesToDisk(updated);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("");
      setCurrentPositions([]);
    }
  };

  const stampSignatures = async () => {
    if (!pdfBytes || !signatureImage || currentPositions.length === 0) {
      setError("Please make sure a PDF is uploaded, a template/position is loaded, and a PNG signature image is uploaded.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStampedUrl(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Load signature PNG image
      const sigImgBytes = await signatureImage.arrayBuffer();
      let sigImageEmbed;
      if (signatureImage.type === "image/png") {
        sigImageEmbed = await pdfDoc.embedPng(sigImgBytes);
      } else if (signatureImage.type === "image/jpeg" || signatureImage.type === "image/jpg") {
        sigImageEmbed = await pdfDoc.embedJpg(sigImgBytes);
      } else {
        throw new Error("Only PNG or JPEG signature images are supported.");
      }

      currentPositions.forEach((pos) => {
        const pageIdx = pos.page - 1;
        if (pageIdx >= pages.length) return;

        const page = pages[pageIdx];
        const { width: pWidth, height: pHeight } = page.getSize();

        // Calculate absolute position based on percentages
        const absX = (pos.x / 100) * pWidth;
        // PDF coordinates start from bottom-left, browser coordinates start from top-left
        const absY = pHeight - ((pos.y / 100) * pHeight) - pos.height;

        page.drawImage(sigImageEmbed, {
          x: absX,
          y: absY,
          width: pos.width,
          height: pos.height,
        });
      });

      const stampedBytes = await pdfDoc.save();
      const blob = new Blob([stampedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setStampedUrl(url);
    } catch (err: any) {
      setError(`Failed to stamp signature: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Bookmark size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          All tools
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <Bookmark size={20} className="text-sky-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Signature Position Saver</h1>
          </div>
          <p className="text-gray-400">
            Define sign/seal box coordinates on templates, save them locally in localStorage, and apply PNG signatures automatically onto new matching PDFs.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs flex items-center justify-center">1</span>
            Upload Template / Contract PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-sky-500/50 hover:bg-sky-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
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
                <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/20 text-sky-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{totalPages} pages · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setCurrentPositions([]);
                  setStampedUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual Coordinator Canvas */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <span className="text-xs">
                    Page {activePage} of {totalPages}
                  </span>
                  <button
                    disabled={activePage === totalPages}
                    onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
                <span className="text-[10px] text-gray-500">Click on the page preview to add position box</span>
              </div>

              <div ref={canvasContainerRef} className="relative border border-white/10 rounded-xl overflow-hidden bg-gray-900 flex justify-center cursor-crosshair">
                <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full" />
                
                {/* Render overlay position markers */}
                {currentPositions
                  .filter((p) => p.page === activePage)
                  .map((pos) => (
                    <div
                      key={pos.id}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: `${pos.width}px`,
                        height: `${pos.height}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute border-2 border-dashed border-sky-400 bg-sky-500/10 flex items-center justify-center pointer-events-none"
                    >
                      <span className="text-[10px] text-sky-200 font-bold bg-gray-950/80 px-1 rounded truncate max-w-full">
                        {pos.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Template Managers Sidebar */}
            <div className="space-y-6">
              
              {/* Positions List */}
              <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-white">Signature Placeholders</h3>
                
                {currentPositions.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No placeholders added. Click the canvas to place a box.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentPositions.map((pos) => (
                      <div key={pos.id} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                        <div>
                          <p className="font-semibold text-white">{pos.name}</p>
                          <p className="text-[9px] text-gray-500">Page {pos.page} · ({Math.round(pos.x)}%, {Math.round(pos.y)}%)</p>
                        </div>
                        <button
                          onClick={() => removePosition(pos.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Current Layout as Template */}
                {currentPositions.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <input
                      type="text"
                      placeholder="Template name (e.g. NDA, Invoice)"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-sky-500 text-white"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Save Layout Template
                    </button>
                  </div>
                )}
              </div>

              {/* Templates Manager */}
              <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-white">Saved Templates</h3>
                {templates.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No templates saved locally yet.</p>
                ) : (
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                        <button
                          onClick={() => applyTemplate(t.id)}
                          className={`font-semibold hover:text-sky-300 transition-colors text-left flex-grow truncate ${
                            selectedTemplateId === t.id ? "text-sky-400" : "text-white"
                          }`}
                        >
                          {t.templateName}
                          <span className="text-[9px] text-gray-500 block font-normal">{t.positions.length} boxes</span>
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stamp Signatures Action */}
              <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-white">Stamping & Signing</h3>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Upload PNG Signature/Stamp</label>
                  <div
                    onClick={() => sigRef.current?.click()}
                    className="border border-dashed border-white/20 hover:border-sky-500/50 hover:bg-white/5 p-3 text-center cursor-pointer rounded-lg transition-colors flex flex-col items-center justify-center"
                  >
                    <input
                      ref={sigRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => e.target.files?.[0] && setSignatureImage(e.target.files[0])}
                      className="hidden"
                    />
                    <ImageIcon className="text-gray-400 mb-1" size={18} />
                    <p className="text-[10px] text-white truncate max-w-full">
                      {signatureImage ? signatureImage.name : "Select Signature PNG"}
                    </p>
                  </div>
                </div>

                <button
                  disabled={isProcessing || !signatureImage || currentPositions.length === 0}
                  onClick={stampSignatures}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Stamping...
                    </>
                  ) : (
                    "Apply Stamp & Generate"
                  )}
                </button>

                {stampedUrl && (
                  <a
                    href={stampedUrl}
                    download={file ? `${file.name.replace(".pdf", "")}_signed.pdf` : "signed.pdf"}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  >
                    <Download size={14} /> Download Signed PDF
                  </a>
                )}
              </div>

            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl max-w-md mx-auto">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
