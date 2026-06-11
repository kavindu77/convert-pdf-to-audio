import React, { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";

interface ToolUploadBoxProps {
  onFileSelect: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  subLabel?: string;
}

export default function ToolUploadBox({
  onFileSelect,
  multiple = false,
  accept = ".pdf,application/pdf",
  label,
  subLabel = "PDF · max 100 MB",
}: ToolUploadBoxProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    onFileSelect(filesArray);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    processFiles(e.dataTransfer.files);
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const defaultLabel = multiple ? "Select PDF files" : "Select PDF file";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerInput}
      className={`w-full max-w-2xl mx-auto border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 bg-white/50 backdrop-blur-sm ${
        isDragActive
          ? "border-indigo-500 bg-indigo-50/20 scale-[1.01]"
          : "border-slate-200 hover:border-indigo-500/50 hover:bg-white shadow-sm hover:shadow-md"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-650 animate-float-slow">
          <Upload size={22} />
        </div>
        <div className="space-y-1">
          <p className="font-extrabold text-slate-800 text-sm">
            {label || defaultLabel}
          </p>
          <p className="text-xs text-slate-400 font-medium">
            {subLabel}
          </p>
        </div>
        <span className="inline-block text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg">
          or drag & drop files here
        </span>
      </div>
    </div>
  );
}
