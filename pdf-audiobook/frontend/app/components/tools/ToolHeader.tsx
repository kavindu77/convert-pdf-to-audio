import React from "react";
import { ICON_MAP } from "./RelatedTools";
import { FileText } from "lucide-react";
import { Plan } from "@/lib/tools";

interface ToolHeaderProps {
  title: string;
  description: string;
  slug: string;
  minPlan: Plan;
  processing: "client" | "server" | "hybrid" | "ai";
  output: string;
  taskCost: number;
}

export default function ToolHeader({
  title,
  description,
  slug,
  minPlan,
  processing,
  output,
  taskCost,
}: ToolHeaderProps) {
  const IconComponent = ICON_MAP[slug] || FileText;

  const getPlanBadge = (plan: Plan) => {
    switch (plan) {
      case "business":
        return { text: "Business", style: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "pro":
        return { text: "Pro", style: "bg-indigo-500/10 text-indigo-650 border-indigo-500/20" };
      default:
        return { text: "Free", style: "bg-green-500/10 text-green-600 border-green-500/20" };
    }
  };

  const getEngineBadge = (proc: typeof processing) => {
    switch (proc) {
      case "server":
        return "Secure server";
      case "ai":
        return "AI";
      case "hybrid":
        return "Hybrid";
      default:
        return "Client-side";
    }
  };

  const planBadge = getPlanBadge(minPlan);
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
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${planBadge.style}`}>
          {planBadge.text}
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
          {engineBadge}
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
          {output.toUpperCase()}
        </span>
        {taskCost > 0 && (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            {taskCost} {taskCost === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
    </div>
  );
}
