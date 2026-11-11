"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe, ExternalLink, Copy, Check, AlertTriangle, Loader2, Megaphone, Sparkles, Building2, Wallet, Star } from "lucide-react";
import { cleanDomain, buildStorefrontUrl } from "@/lib/storefront-utils";

interface Initial {
  slug: string;
  name: string;
  description: string;
  whatsapp: string;
  phone: string;
  whatsappGroupLink: string;
  location: string;
  contactText: string;
  whatsappLabel: string;
  notice: string;
  reviewsEnabled: boolean;
  payoutNetwork: string;
  payoutNumber: string;
  payoutAccountName: string;
}

export function StorefrontSettingsForm({
  initial,
  storefrontDomain = "cleandatapacks.com",
}: {
  initial: Initial;
  storefrontDomain?: string;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Slug specific state
  const [currentSlug, setCurrentSlug] = React.useState(initial.slug);
  const [slugInput, setSlugInput] = React.useState(initial.slug);
  const [slugMsg, setSlugMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [slugBusy, setSlugBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const cleanDomainStr = cleanDomain(storefrontDomain);
  const liveStoreUrl = buildStorefrontUrl(currentSlug, cleanDomainStr);
  const previewStoreUrl = buildStorefrontUrl(slugInput.trim() || currentSlug, cleanDomainStr);

  const set = (k: keyof Initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (k === "phone" || k === "whatsapp" || k === "payoutNumber") {
      val = val.replace(/\D/g, "").slice(0, 10);
    }
    setForm((f) => ({ ...f, [k]: val }));
  };

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setSlugInput(val);
    if (slugMsg) setSlugMsg(null);
  }

  async function copyStoreLink() {
    try {
      await navigator.clipboard.writeText(liveStoreUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function saveSlug(e: React.FormEvent) {
    e.preventDefault();
    const cleanSlug = slugInput
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (cleanSlug.length < 3 || cleanSlug.length > 32) {
      setSlugMsg({ kind: "err", text: "Address slug must be between 3 and 32 characters." });
      return;
    }

    if (cleanSlug === currentSlug) {
      setSlugMsg({ kind: "ok", text: "Store address is already set to this." });
      return;
    }

    setSlugBusy(true);
    setSlugMsg(null);
    try {
      const res = await fetch("/api/storefront/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleanSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update store address");

      const savedSlug = data.storefront?.slug || cleanSlug;
      setCurrentSlug(savedSlug);
      setSlugInput(savedSlug);
      setSlugMsg({
        kind: "ok",
        text: `Store address updated successfully to ${cleanDomainStr}/store/${savedSlug}!`,
      });
      router.refresh();
    } catch (err) {
      setSlugMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed to update store address" });
    } finally {
      setSlugBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.name,
          description: form.description,
          phone: form.phone,
          whatsappGroupLink: form.whatsappGroupLink,
          supportPhone: form.whatsapp || form.phone,
          location: form.location,
          contactText: form.contactText,
          whatsappLabel: form.whatsappLabel,
          notice: form.notice,
          reviewsEnabled: form.reviewsEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMsg({ kind: "ok", text: "Storefront profile calibrated and saved." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setBusy(false);
    }
  }

  async function savePayout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/settings/payout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutNetwork: form.payoutNetwork,
          payoutNumber: form.payoutNumber,
          payoutAccountName: form.payoutAccountName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMsg({ kind: "ok", text: "Default MoMo payout coordinates saved." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Store Address / Slug Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-[#162740] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 p-2.5 text-[#00df82]">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Public Storefront Slug</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your exclusive domain slug for customer checkouts and shareable storefront links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={liveStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#00df82]" />
              Visit Store
            </a>
            <button
              type="button"
              onClick={copyStoreLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 px-3.5 py-2 text-xs font-bold text-[#00df82] hover:bg-[#00df82]/20 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>
        </div>

        {slugMsg && (
          <div
            className={`mt-4 rounded-2xl border p-3.5 text-xs font-bold ${
              slugMsg.kind === "ok"
                ? "border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {slugMsg.text}
          </div>
        )}

        <form onSubmit={saveSlug} className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Customize Web Slug
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex min-h-10 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] focus-within:border-[#00df82]">
                <span className="flex items-center bg-slate-100 dark:bg-[#060b13] px-3.5 text-xs font-mono font-bold text-slate-500 select-none border-r border-slate-200 dark:border-[#162740]">
                  {cleanDomainStr.startsWith("localhost") || cleanDomainStr.startsWith("127.0.0.1")
                    ? `http://${cleanDomainStr}/store/`
                    : `https://${cleanDomainStr}/store/`}
                </span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={handleSlugChange}
                  placeholder="kofi-bundles"
                  maxLength={32}
                  className="flex-1 bg-transparent px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={slugBusy || slugInput.trim() === currentSlug || slugInput.trim().length < 3}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#00df82] px-5 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                {slugBusy ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Slug"
                )}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
              <span>Allowed: 3–32 characters (lowercase letters, numbers, hyphens).</span>
              <span className="font-mono text-cyan-400">Preview: {previewStoreUrl}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              <strong>Notice:</strong> Changing your web address re-routes your storefront link immediately. Ensure you update any marketing banners or social links.
            </p>
          </div>
        </form>
      </div>

      {msg && (
        <div
          className={`rounded-2xl border p-4 text-xs font-bold ${
            msg.kind === "ok"
              ? "border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Store Profile Form */}
      <form onSubmit={saveProfile} className="space-y-4 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#162740] pb-4">
          <div className="rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 p-2.5 text-[#00df82]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Storefront Branding &amp; Customer Support</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Information displayed on your public customer checkout interface.</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Store Brand Name</label>
          <input value={form.name} onChange={set("name")} placeholder="Kofi Express Bundles" required className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Storefront Bio Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="Affordable non-expiry MTN, Telecel, and AirtelTigo data bundles with automated MoMo processing."
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 py-2 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Primary Contact Phone</label>
            <input value={form.phone} onChange={set("phone")} placeholder="0241234567" inputMode="tel" maxLength={10} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">WhatsApp Community Group Link</label>
            <input value={form.whatsappGroupLink} onChange={set("whatsappGroupLink")} placeholder="https://chat.whatsapp.com/..." className={inputCls} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer Support WhatsApp</label>
            <input value={form.whatsapp} onChange={set("whatsapp")} placeholder="0241234567" inputMode="tel" maxLength={10} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location Tag (Optional)</label>
            <input value={form.location} onChange={set("location")} placeholder="Accra, Ghana" className={inputCls} />
          </div>
        </div>

        {/* Floating WhatsApp Bubble Config */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Floating WhatsApp Support Pill
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Bubble Tooltip Text</label>
              <input
                value={form.contactText}
                onChange={set("contactText")}
                placeholder="Need help? Chat with us on WhatsApp"
                maxLength={120}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Button Label</label>
              <input
                value={form.whatsappLabel}
                onChange={set("whatsappLabel")}
                placeholder="Chat Support"
                maxLength={40}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Marquee Notice Banner Config */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#00df82]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Storefront Marquee Notice Banner
              </h3>
            </div>
            {form.notice && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, notice: "" }))}
                className="text-xs font-bold text-red-500 dark:text-red-400 hover:underline"
              >
                Clear Notice
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Notice Text ({form.notice.length}/300 characters)
            </label>
            <input
              value={form.notice}
              onChange={set("notice")}
              maxLength={300}
              placeholder="⚡ Fast MoMo checkout — bundles delivered instantly to any network."
              className={inputCls}
            />
          </div>

          {/* Live Preview */}
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Preview
            </span>
            <div className="rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-100 dark:bg-[#060b13] px-4 py-2.5">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
                <span className="rounded-full border border-[#00df82]/40 bg-[#00df82]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00df82]">
                  ALERT
                </span>
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {form.notice.trim() || "⚡ Fast MoMo checkout — bundles delivered instantly to any network."}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#00df82]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preset Marquee Templates
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "🔥 Instant MoMo checkout — high-speed non-expiry data delivered in seconds.",
                "⚡ 24/7 Automated telecom fulfillment across MTN, Telecel, and AirtelTigo.",
                "🎉 Flash Promo active! Special discounted bundle packages available today.",
                "⚠️ Network notice: Telecel gateway processing is experiencing brief delays.",
                "📞 Questions or inquiries? Reach our live WhatsApp helpdesk anytime!",
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, notice: tmpl }))}
                  className="rounded-lg border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#060b13] px-2.5 py-1 text-left text-[11px] text-slate-700 dark:text-slate-300 hover:border-[#00df82]/40 hover:text-slate-900 dark:hover:text-white transition"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Reviews Feature Toggle */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-slate-50/70 dark:bg-[#070d18] p-4.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border transition-colors ${form.reviewsEnabled ? "border-amber-400/30 bg-amber-400/10 text-amber-500 dark:text-amber-400" : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}>
                <Star className={`h-4 w-4 ${form.reviewsEnabled ? "fill-current" : ""}`} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Customer Reviews &amp; Testimonials
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allow customers to view verified customer ratings and submit feedback on your public storefront.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, reviewsEnabled: !f.reviewsEnabled }))}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.reviewsEnabled ? "bg-[#00df82]" : "bg-slate-300 dark:bg-slate-700"
              }`}
              role="switch"
              aria-checked={form.reviewsEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-[#060b13] shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form.reviewsEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Public visibility:</span>
            {form.reviewsEnabled ? (
              <span className="font-bold text-[#00df82] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00df82]" />
                Enabled — ⭐ Reviews tab is visible on storefront
              </span>
            ) : (
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                Disabled — Reviews tab is hidden from storefront
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-xl bg-[#00df82] px-6 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:opacity-40 transition"
        >
          {busy ? "Saving Profile…" : "Save Storefront Profile"}
        </button>
      </form>

      {/* Default MoMo Payout Form */}
      <form onSubmit={savePayout} className="space-y-4 rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#162740] pb-4">
          <div className="rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 p-2.5 text-[#00df82]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Default MoMo Settlement Coordinates</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">These details auto-fill whenever you submit a profit cash-out request.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mobile Money Provider</label>
            <select
              value={form.payoutNetwork}
              onChange={set("payoutNetwork")}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] px-3.5 text-xs font-bold text-slate-900 dark:text-white focus:border-[#00df82] focus:outline-none [&>option]:bg-white dark:[&>option]:bg-[#070d18] [&>option]:text-slate-900 dark:[&>option]:text-white"
            >
              <option value="MTN">MTN MoMo</option>
              <option value="TELECEL">Telecel Cash</option>
              <option value="AIRTELTIGO">AirtelTigo Money</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subscriber MoMo Number</label>
            <input value={form.payoutNumber} onChange={set("payoutNumber")} placeholder="0241234567" inputMode="tel" maxLength={10} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registered Account Name</label>
          <input value={form.payoutAccountName} onChange={set("payoutAccountName")} placeholder="Official Account Name" className={inputCls} />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-xl bg-[#00df82] px-6 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:opacity-40 transition"
        >
          {busy ? "Saving Coordinates…" : "Save Settlement Account"}
        </button>
      </form>
    </div>
  );
}
