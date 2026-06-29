import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOOLS } from "@/lib/tools";
import {
  Merge,
  Scissors,
  Archive,
  RotateCw,
  FileImage,
  Image,
  FileText,
  ClipboardList,
  Clock,
  Droplets,
  EyeOff,
  Tags,
  MessageSquare,
  Sparkles,
  Layers,
  Mic,
  Eye,
  ShieldCheck,
  AlertOctagon,
  Paperclip,
  Lock,
  Palette,
  Sun,
  ScanLine,
  Link2,
  QrCode
} from "lucide-react";

export const ICON_MAP: Record<string, any> = {
  merge: Merge,
  split: Scissors,
  compress: Archive,
  rotate: RotateCw,
  "pdf-to-images": Image,
  "images-to-pdf": FileImage,
  "extract-text": FileText,
  "form-filler": ClipboardList,
  "reading-time": Clock,
  watermark: Droplets,
  redact: EyeOff,
  "page-labels": Tags,
  "pdf-chat": MessageSquare,
  summarize: Sparkles,
  flashcards: Layers,
  "pdf-to-audio": Mic,
  "privacy-report": Eye,
  "evidence-locker": ShieldCheck,
  "fake-redaction": AlertOctagon,
  attachments: Paperclip,
  "hidden-layers": Layers,
  "link-safety": Link2,
  "barcode-scanner": QrCode,
  "password-protect": Lock,
  "color-detector": Palette,
  "ink-saver": Sun,
  "bad-scan-detector": ScanLine,
};

interface RelatedToolsProps {
  currentToolSlug: string;
  category: string;
}

export default function RelatedTools({ currentToolSlug, category }: RelatedToolsProps) {
  const router = useRouter();

  const related = TOOLS.filter(
    (t) => t.category === category && t.slug !== currentToolSlug
  ).slice(0, 3);

  if (related.length === 0) return null;

  const handleToolClick = (e: React.MouseEvent<HTMLButtonElement>, tool: typeof TOOLS[0]) => {
    e.preventDefault();
    router.push(`/tools/${tool.slug}`);
  };

  return (
    <div className="w-full mt-12 border-t border-slate-200/60 pt-10">
      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider text-center mb-6">
        Related PDF Tools
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {related.map((tool) => {
          const IconComponent = ICON_MAP[tool.slug] || FileText;
          return (
            <button
              key={tool.slug}
              onClick={(e) => handleToolClick(e, tool)}
              className="flex items-start gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-650 group-hover:scale-105 transition-transform">
                <IconComponent size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-650 transition-colors">
                    {tool.name}
                  </h4>
                  {tool.minPlan !== "free" && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      tool.minPlan === "business" 
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                    }`}>
                      {tool.minPlan}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Fast, secure processing for {tool.output} output.
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
