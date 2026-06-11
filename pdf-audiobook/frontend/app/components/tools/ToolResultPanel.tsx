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
    <div className="w-full max-w-xl mx-auto bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4 animate-in">
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
        <CheckCircle2 size={16} className="shrink-0" />
        <div className="text-left">
          <p className="font-extrabold text-slate-900">{title}</p>
          {subTitle && <p className="text-[10px] text-slate-500 mt-0.5">{subTitle}</p>}
        </div>
      </div>

      {children && <div className="py-1">{children}</div>}

      <div className="space-y-2 pt-2">
        {onDownload && (
          <button
            onClick={onDownload}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white bg-green-500 hover:bg-green-600 transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2 border-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download size={15} />
            {downloadLabel}
          </button>
        )}

        <button
          onClick={onReset}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-xs text-slate-400 hover:text-slate-650 hover:bg-slate-50 font-bold transition-all bg-transparent cursor-pointer"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
