import React from "react";

interface ToolNoticeProps {
  processing: "client" | "server" | "hybrid" | "ai";
}

export default function ToolNotice({ processing }: ToolNoticeProps) {
  const isClient = processing === "client";
  return (
    <div className="flex justify-center mt-4">
      <p className="text-[11px] text-slate-500 max-w-md bg-slate-50 border border-slate-200/60 py-1.5 px-3 rounded-xl shadow-sm text-center font-medium">
        {isClient ? (
          <>🛡️ Processed in your browser.</>
        ) : (
          <>🛡️ Secure temporary processing.</>
        )}
      </p>
    </div>
  );
}
