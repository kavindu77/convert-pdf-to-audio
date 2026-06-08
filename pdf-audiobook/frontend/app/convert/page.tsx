"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConvertRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tools/pdf-to-audio");
  }, [router]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Redirecting...
    </div>
  );
}