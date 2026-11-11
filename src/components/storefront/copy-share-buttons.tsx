"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";

/** Copy-to-clipboard (and optional WhatsApp share) for the public store link. */
export function CopyShareButtons({ url, storeName }: { url: string; storeName: string }) {
  const [copied, setCopied] = React.useState(false);
  const [fullUrl, setFullUrl] = React.useState(url);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (url.startsWith("/")) {
        setFullUrl(`${window.location.origin}${url}`);
      } else {
        setFullUrl(url);
      }
    }
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Clipboard API fallback
      const ta = document.createElement("textarea");
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent(
    `Order data bundles instantly at ${storeName} — automated delivery on all networks: ${fullUrl}`
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#070d18] px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[#00df82]" /> : <Copy className="h-3.5 w-3.5 text-[#00df82]" />}
        <span>{copied ? "Copied Link!" : "Copy Link"}</span>
      </button>
      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3.5 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/20 transition"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Share via WhatsApp</span>
      </a>
    </div>
  );
}
