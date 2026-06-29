import React from "react";
import { ICON_MAP } from "./RelatedTools";
import { FileText } from "lucide-react";

interface ToolHeaderProps {
  title: string;
  description: string;
  slug: string;
  minPlan?: string; // retained for backwards compat, ignored
  processing: "client" | "server" | "hybrid" | "ai";
  output: string;
  taskCost?: number; // retained for backwards compat, ignored
}

export default function ToolHeader({
  title,
  description,
  slug,
  processing,
  output,
}: ToolHeaderProps) {
  const IconComponent = ICON_MAP[slug] || FileText;

  const getEngineBadge = (proc: typeof processing) => {
    switch (proc) {
      case "server":
        return "Secure server";
      case "ai":
        return "AI-powered";
      case "hybrid":
        return "Hybrid";
      default:
        return "Client-side";
    }
  };

  const engineBadge = getEngineBadge(processing);

  return (
    <div className="w-full max-w-3xl mx-auto text-center space-y-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto shadow-sm text-indigo-600">
        <IconComponent size={22} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 pt-1">
        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-green-500/10 text-green-600 border border-green-500/20">
          Free
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
          {engineBadge}
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
          {output.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
