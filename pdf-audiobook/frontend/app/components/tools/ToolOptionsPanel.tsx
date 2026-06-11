import React from "react";

interface ToolOptionsPanelProps {
  title?: string;
  children: React.ReactNode;
}

export default function ToolOptionsPanel({ title, children }: ToolOptionsPanelProps) {
  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-slate-700">
      {title && (
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
