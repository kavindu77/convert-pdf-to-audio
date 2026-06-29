import React from "react";
import { ICON_MAP } from "./RelatedTools";
import { FileText } from "lucide-react";

interface ToolHeaderProps {
  title: string;
  description: string;
  slug: string;
  minPlan?: string;
  processing: "client" | "server" | "hybrid" | "ai";
  output: string;
  taskCost?: number;
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
    <div className="w-full max-w-2xl mx-auto text-center space-y-3 mb-6 select-none">
      {/* Retro Icon Frame */}
      <div className="win95-in w-12 h-12 bg-white flex items-center justify-center mx-auto text-[#000080]">
        <IconComponent size={22} />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-black uppercase tracking-wide">
          {title}
        </h1>
        <p className="text-gray-600 text-xs max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Retro Button Badges */}
      <div className="flex flex-wrap justify-center gap-1.5 pt-1.5 font-sans">
        <span className="win95-btn px-3 py-0.5 text-[9px] font-bold uppercase bg-[#c0c0c0] text-black border border-transparent">
          🎁 Free to use
        </span>
        <span className="win95-btn px-3 py-0.5 text-[9px] font-bold uppercase bg-[#c0c0c0] text-black border border-transparent">
          ⚙️ {engineBadge}
        </span>
        <span className="win95-btn px-3 py-0.5 text-[9px] font-bold uppercase bg-[#c0c0c0] text-black border border-transparent">
          💾 {output.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
