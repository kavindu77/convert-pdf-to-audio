"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  adSlot: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  className?: string;
}

export default function AdBanner({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  className = "",
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // @ts-ignore
      if (typeof window !== "undefined" && window.adsbygoogle) {
        // @ts-ignore
        window.adsbygoogle.push({});
      }
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <div className={`w-full flex justify-center items-center py-4 ${className}`}>
      <div className="w-full max-w-4xl bg-white/[0.02] border border-white/5 rounded-2xl p-4 glass-card text-center relative overflow-hidden">
        <span className="absolute top-2 right-4 text-[9px] uppercase tracking-widest text-gray-600 font-semibold z-10">
          Advertisement
        </span>
        <div className="min-h-[90px] flex items-center justify-center w-full relative z-20">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // REPLACE WITH ACTUAL CLIENT ID
            data-ad-slot={adSlot}
            data-ad-format={adFormat}
            data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
          />
        </div>
      </div>
    </div>
  );
}
