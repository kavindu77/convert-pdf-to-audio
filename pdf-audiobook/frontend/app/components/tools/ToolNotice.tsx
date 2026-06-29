import React from "react";

interface ToolNoticeProps {
  processing: "client" | "server" | "hybrid" | "ai";
}

export default function ToolNotice({ processing }: ToolNoticeProps) {
  const isClient = processing === "client";
  return (
    <div className="flex justify-center mt-4 w-full">
      <div className="win95-in p-3 bg-[#ffffcc] text-black border border-[#808080] max-w-xl text-center select-text font-mono text-[11px] leading-relaxed">
        <p className="font-bold text-[#000080] mb-1">
          🔔 NOTICE: 100% Free Service
        </p>
        <p className="mb-2">
          All tools are completely free to use with no daily usage limits or paywalls. This is a valuable opportunity for everyone to access professional document security utilities!
        </p>
        <div className="h-[1px] bg-black/25 my-1.5" />
        <p className="font-semibold text-gray-700">
          {isClient ? (
            <>🛡️ Processing engine: Client-side sandbox. Your file never leaves your machine.</>
          ) : (
            <>🛡️ Processing engine: Secure temporary server-side gateways. Files are immediately purged after task completion.</>
          )}
        </p>
      </div>
    </div>
  );
}
