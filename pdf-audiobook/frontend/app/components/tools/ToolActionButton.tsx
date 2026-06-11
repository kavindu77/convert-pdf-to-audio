import React from "react";
import { Loader2 } from "lucide-react";

interface ToolActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  label: string;
  loadingLabel?: string;
  className?: string;
}

export default function ToolActionButton({
  onClick,
  disabled = false,
  loading = false,
  icon,
  label,
  loadingLabel = "Processing...",
  className = "",
}: ToolActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3 px-6 rounded-xl font-extrabold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none ${
        disabled || loading
          ? "bg-slate-350 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 hover:-translate-y-0.5 active:translate-y-0"
      } ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
