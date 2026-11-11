"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.toLowerCase().includes("failed to load chunk") ||
    error?.message?.toLowerCase().includes("loading chunk") ||
    error?.message?.toLowerCase().includes("loading css chunk");

  useEffect(() => {
    console.error("Application error:", error);

    // Auto-recover from chunk loading errors caused by new production builds/deployments
    if (isChunkError && typeof window !== "undefined") {
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem("ct_chunk_reload_time") || 0);
      // Auto-reload once within a 15-second window to prevent infinite loops
      if (now - lastReload > 15000) {
        sessionStorage.setItem("ct_chunk_reload_time", String(now));
        setReloading(true);
        window.location.reload();
      }
    }
  }, [error, isChunkError]);

  const handleRetry = () => {
    if (isChunkError && typeof window !== "undefined") {
      setReloading(true);
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-[#00df82] selection:text-[#041d14]">
      <div className="w-full max-w-md rounded-3xl border border-[#162740] bg-[#0b1322] p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">
            {isChunkError ? "Platform Update Detected" : "Something went wrong"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isChunkError
              ? "A fresh build of CleanDataPacks was deployed. Reloading will sync your browser with the latest platform assets."
              : error?.message || "An unexpected error occurred while rendering this page."}
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-slate-500">Error Digest: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRetry}
            disabled={reloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00df82] px-5 py-2.5 text-xs font-black text-[#041d14] hover:bg-[#00c572] transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`} />
            <span>{reloading ? "Reloading..." : isChunkError ? "Reload Page" : "Try Again"}</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#162740] bg-[#070d18] px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-[#111e33] transition"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
