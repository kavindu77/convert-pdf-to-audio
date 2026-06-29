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
      className={`win95-btn w-full py-2 px-6 font-bold text-xs text-black flex items-center justify-center gap-1.5 disabled:text-gray-500 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={12} className="animate-spin shrink-0" />
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
