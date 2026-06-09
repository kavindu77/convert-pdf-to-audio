"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  Download,
} from "lucide-react";

interface ExtractedFormField {
  name: string;
  type: string;
  value: string;
}

export default function FormExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedFormField[]>([]);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setFields([]);
    setCsvUrl(null);
  }, []);

  const extractFormData = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setCsvUrl(null);

    try {
      const { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      const rawFields = form.getFields();

      if (rawFields.length === 0) {
        throw new Error("No form fields detected in this PDF. Verify the document is an interactive PDF form.");
      }

      const extracted: ExtractedFormField[] = [];

      rawFields.forEach((field) => {
        const name = field.getName();
        let type = "Unknown";
        let value = "";

        if (field instanceof PDFTextField) {
          type = "Text Field";
          value = field.getText() || "";
        } else if (field instanceof PDFCheckBox) {
          type = "Checkbox";
          value = field.isChecked() ? "Yes" : "No";
        } else if (field instanceof PDFDropdown) {
          type = "Dropdown";
          value = field.getSelected().join(", ") || "";
        } else if (field instanceof PDFRadioGroup) {
          type = "Radio Group";
          value = field.getSelected() || "";
        }

        extracted.push({ name, type, value });
      });

      setFields(extracted);

      // Create CSV Blob
      let csvContent = "Field Name,Field Type,Value\n";
      extracted.forEach((f) => {
        // Escape commas and double quotes for clean CSV parsing
        const escapedName = `"${f.name.replace(/"/g, '""')}"`;
        const escapedType = `"${f.type.replace(/"/g, '""')}"`;
        const escapedValue = `"${f.value.replace(/"/g, '""')}"`;
        csvContent += `${escapedName},${escapedType},${escapedValue}\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      setCsvUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to extract form fields.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FileSpreadsheet size={18} />
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center font-medium">
              <FileSpreadsheet size={20} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Form Data Extractor</h1>
          </div>
          <p className="text-gray-400 font-normal">
            Extract filled values from interactive PDF forms (like tax forms, surveys, or invoices) into structured CSV data instantly in your browser.
          </p>
        </div>

        {/* Upload Area */}
        <section className="rounded-2xl border border-white/10 p-6 space-y-6 bg-white/[0.02] backdrop-blur-md">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs flex items-center justify-center">1</span>
            Upload Interactive Form PDF
          </h2>

          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-amber-500/50 hover:bg-amber-500/[0.02] rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="mx-auto text-gray-500 mb-4 animate-bounce" size={36} />
              <p className="text-sm text-white font-medium">Click or drag interactive form PDF here</p>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDFs up to 50 MB</p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 text-amber-400">
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
                  setFields([]);
                  setCsvUrl(null);
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors animate-fade-in"
              >
                Clear
              </button>
            </div>
          )}

          {file && !isProcessing && fields.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={extractFormData}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                Extract Data Fields
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
              <Loader2 size={24} className="animate-spin text-amber-400" />
              <p className="text-xs text-gray-400 font-medium">Reading form data tree...</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center border border-red-500/10 p-3 bg-red-500/5 rounded-xl">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {fields.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">Extracted Form Data ({fields.length} fields)</h2>
              {csvUrl && (
                <a
                  href={csvUrl}
                  download={file ? `${file.name.replace(".pdf", "")}_form_data.csv` : "form_data.csv"}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  <Download size={14} /> Export CSV
                </a>
              )}
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-3 text-gray-400 font-semibold uppercase tracking-wider">Field Name</th>
                      <th className="p-3 text-gray-400 font-semibold uppercase tracking-wider">Field Type</th>
                      <th className="p-3 text-gray-400 font-semibold uppercase tracking-wider">Filled Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-semibold text-white font-mono">{f.name}</td>
                        <td className="p-3 text-gray-400">{f.type}</td>
                        <td className="p-3 text-yellow-100 font-medium">
                          {f.value === "" ? <span className="text-gray-600 italic">Empty</span> : f.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
