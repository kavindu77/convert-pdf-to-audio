import React from "react";
import { CheckCircle2, Download } from "lucide-react";

interface ToolResultPanelProps {
  title: string;
  subTitle?: string;
  onDownload?: () => void;
  downloadLabel?: string;
  onReset: () => void;
  resetLabel?: string;
  children?: React.ReactNode;
}

export default function ToolResultPanel({
  title,
  subTitle,
  onDownload,
  downloadLabel = "Download File",
  onReset,
  resetLabel = "Process another",
  children,
}: ToolResultPanelProps) {
  return (
    <div className="w-full max-w-xl mx-auto win95-out p-5 bg-[#c0c0c0] space-y-4 font-mono select-none">
      {/* Retro Alert Dialog Box Header */}
      <div className="win95-in p-3 bg-white flex items-start gap-3 select-text">
        <CheckCircle2 size={18} className="text-green-700 shrink-0 mt-0.5" />
        <div className="text-left font-mono text-xs">
          <p className="font-bold text-black uppercase">{title}</p>
          {subTitle && <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{subTitle}</p>}
        </div>
      </div>

      {children && <div className="win95-in p-3 bg-white text-xs">{children}</div>}

      <div className="flex flex-col gap-2 pt-1 font-sans">
        {onDownload && (
          <button
            onClick={onDownload}
            className="win95-btn w-full py-2 font-bold text-xs text-black flex items-center justify-center gap-1.5"
          >
            <Download size={14} className="shrink-0" />
            <span>{downloadLabel}</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="win95-btn w-full py-1 text-xs text-gray-600 font-bold"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
