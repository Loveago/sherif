"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Store, Sparkles } from "lucide-react";

export function StoreApplyForm({
  rejected,
  rejectionNote,
  previousName,
  previousPhone,
  previousWhatsappGroupLink,
  previousDescription,
}: {
  rejected: boolean;
  rejectionNote: string | null;
  previousName: string;
  previousPhone?: string;
  previousWhatsappGroupLink?: string;
  previousDescription: string;
}) {
  const router = useRouter();
  const [storeName, setStoreName] = React.useState(rejected ? "" : previousName);
  const [contactNumber, setContactNumber] = React.useState(rejected ? "" : (previousPhone ?? ""));
  const [whatsappGroupLink, setWhatsappGroupLink] = React.useState(
    rejected ? "" : (previousWhatsappGroupLink ?? "")
  );
  const [description, setDescription] = React.useState(previousDescription);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cleanLink = whatsappGroupLink.trim();
      const normalizedLink = cleanLink.startsWith("http://") || cleanLink.startsWith("https://")
        ? cleanLink
        : `https://${cleanLink}`;

      const res = await fetch("/api/storefront/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          contactNumber: contactNumber.trim(),
          whatsappGroupLink: normalizedLink,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit your application");
      setDone(true);
      router.refresh();
      setTimeout(() => router.push("/dashboard/storefront/pending"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none";

  if (done) {
    return (
      <div className="mt-6 rounded-3xl border border-[#00df82]/30 bg-[#00df82]/10 p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#00df82]" />
        <p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Application Ingested Successfully!
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Re-routing to application verification telemetry…
        </p>
      </div>
    );
  }

  const isValid =
    storeName.trim().length >= 2 &&
    contactNumber.trim().length === 10 &&
    whatsappGroupLink.trim().length >= 5;

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
      {rejected && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-300">
          <p className="flex items-center gap-2 font-bold text-red-700 dark:text-red-200">
            <AlertCircle className="h-4 w-4" /> Previous submission was not approved
          </p>
          {rejectionNote && <p className="mt-1 font-mono">Feedback: {rejectionNote}</p>}
          <p className="mt-1 text-slate-500 dark:text-slate-400">You may recalibrate and submit an updated application below.</p>
        </div>
      )}

      <div>
        <label htmlFor="storeName" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Storefront Brand Name <span className="text-[#00df82]">*</span>
        </label>
        <input
          id="storeName"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g. Kofi Data Hub"
          required
          minLength={2}
          maxLength={60}
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Visible to retail buyers. Your dedicated web slug is provisioned on approval.
        </p>
      </div>

      <div>
        <label htmlFor="contactNumber" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Primary Contact Phone <span className="text-[#00df82]">*</span>
        </label>
        <input
          id="contactNumber"
          type="tel"
          inputMode="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="0241234567"
          required
          maxLength={10}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="whatsappGroupLink" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          WhatsApp Community Link <span className="text-[#00df82]">*</span>
        </label>
        <input
          id="whatsappGroupLink"
          type="text"
          value={whatsappGroupLink}
          onChange={(e) => setWhatsappGroupLink(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          required
          minLength={5}
          maxLength={255}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="storeDesc" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Storefront Description <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="storeDesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell buyers about your fast non-expiry data bundles"
          rows={3}
          maxLength={600}
          className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 py-2 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-bold text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !isValid}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00df82] text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:opacity-40 transition"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Transmitting Application…" : "Submit Storefront Application"}
      </button>
      <p className="text-center text-[11px] text-slate-500">
        Administrative review is usually rapid. Telemetry will update automatically.
      </p>
    </form>
  );
}
