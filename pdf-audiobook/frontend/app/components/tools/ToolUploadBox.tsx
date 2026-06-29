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
      className={`w-full max-w-2xl mx-auto p-8 text-center cursor-pointer select-none border-2 border-dashed ${
        isDragActive
          ? "border-[#000080] bg-[#dfdfdf] scale-[1.01]"
          : "border-[#808080] hover:border-black bg-white"
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
        {/* Retro upload button container */}
        <div className="win95-out w-12 h-12 bg-[#c0c0c0] flex items-center justify-center mx-auto text-black active:scale-[0.98]">
          <Upload size={20} />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-black text-xs font-mono">
            {label || defaultLabel}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">
            {subLabel}
          </p>
        </div>
        <span className="win95-btn inline-block text-[9px] font-bold font-sans uppercase tracking-wider bg-[#c0c0c0] text-black px-3 py-1">
          or drag & drop files here
        </span>
      </div>
    </div>
  );
}
