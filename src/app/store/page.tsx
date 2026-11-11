import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WELL, THIS IS AWKWARD",
  description:
    "You came looking for something. There is nothing here. Anyway, here’s a Chihuahua sitting in a chair to compensate for your troubles 😂",
  icons: {
    icon: [
      { url: "/store/icon.svg", type: "image/svg+xml" },
      { url: "/store/favicon.ico", sizes: "any" },
      { url: "/store/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/store/apple-icon.svg", type: "image/svg+xml" },
      { url: "/store/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function StorefrontIndexPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b13] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-6 selection:bg-[#00df82] selection:text-[#041d14]">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              WELL, THIS IS AWKWARD
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              You came looking for something
            </p>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-normal">
              There is nothing here
            </p>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 font-medium pt-1">
              Anyway, here’s a Chihuahua sitting in a chair to compensate for your troubles 😂
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white p-2">
            <Image
              src="/chihuahua.png"
              alt="Chihuahua sitting in a chair with sunglasses"
              width={684}
              height={1024}
              priority
              className="w-auto h-auto max-h-[480px] max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      </div>

      <footer className="mt-12 pt-6 border-t border-slate-200/80 dark:border-white/10 w-full max-w-2xl text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              CleanDataPacks Storefronts © {new Date().getFullYear()}
            </span>
            <span>·</span>
            <a
              href="https://wa.me/233507904981"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors group"
            >
              <span>Powered by</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:underline">
                CrazyTech Enterprise
              </span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link href="/refund-policy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Refunds
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
