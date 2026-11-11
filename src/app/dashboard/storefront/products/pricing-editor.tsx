"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sliders, CheckCircle2, AlertCircle, Package, ArrowUpRight, ShieldCheck, Zap, RefreshCw } from "lucide-react";

interface Pkg {
  id: string;
  network: string;
  gbAmount: number;
  name: string;
  cost: number; // GHS
}
interface Prod {
  packageId: string;
  sellingPrice: number; // GHS
  isActive: boolean;
}

const NETWORK_STYLES: Record<string, string> = {
  MTN: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
  TELECEL: "border border-rose-500/30 bg-rose-500/10 text-rose-300",
  AIRTELTIGO: "border border-sky-500/30 bg-sky-500/10 text-sky-300",
};

export function PricingEditor({
  packages,
  products,
  minMarkup = 0,
  maxMarkup = null,
  disabled,
}: {
  packages: Pkg[];
  products: Prod[];
  minMarkup?: number;
  maxMarkup?: number | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [packageList, setPackageList] = React.useState<Pkg[]>(packages);
  const [productList, setProductList] = React.useState<Prod[]>(products);
  const byId = React.useMemo(() => new Map(productList.map((p) => [p.packageId, p])), [productList]);

  const [prices, setPrices] = React.useState<Record<string, string>>(() => {
    const prodMap = new Map(products.map((p) => [p.packageId, p]));
    return Object.fromEntries(
      packages.map((p) => [
        p.id,
        prodMap.get(p.id)?.sellingPrice != null
          ? prodMap.get(p.id)!.sellingPrice.toFixed(2)
          : p.cost.toFixed(2),
      ])
    );
  });

  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkMarkup, setBulkMarkup] = React.useState("");
  const [filter, setFilter] = React.useState<string>("MTN");
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [syncingProfile, setSyncingProfile] = React.useState(false);

  // Sync state if props change
  React.useEffect(() => {
    setPackageList(packages);
  }, [packages]);

  React.useEffect(() => {
    setProductList(products);
  }, [products]);

  // Only initialize prices for newly added packages that don't already have an entry
  // to avoid overwriting values while the user is actively typing or editing.
  React.useEffect(() => {
    setPrices((prev) => {
      let changed = false;
      const next = { ...prev };
      const prodMap = new Map(products.map((p) => [p.packageId, p]));
      for (const pkg of packages) {
        if (next[pkg.id] === undefined) {
          const prod = prodMap.get(pkg.id);
          next[pkg.id] =
            prod?.sellingPrice != null
              ? prod.sellingPrice.toFixed(2)
              : pkg.cost.toFixed(2);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [packages, products]);

  // Refresh data explicitly after bulk operations
  const refreshData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/storefront/products");
      if (!res.ok) return;
      const data = await res.json();
      const newPackages: Pkg[] = Array.isArray(data.packages) ? data.packages : [];
      const newProducts: Prod[] = Array.isArray(data.products)
        ? data.products.map((p: any) => ({
            packageId: p.packageId,
            sellingPrice: p.sellingPrice / 100,
            isActive: p.isActive,
          }))
        : [];

      if (newPackages.length > 0) {
        setPackageList(newPackages);
      }
      if (newProducts.length > 0) {
        setProductList(newProducts);
        const pMap = new Map(newProducts.map((p) => [p.packageId, p]));
        setPrices((prev) => {
          const next: Record<string, string> = { ...prev };
          const pkgs = newPackages.length > 0 ? newPackages : packages;
          for (const pkg of pkgs) {
            const match = pMap.get(pkg.id);
            if (match) {
              next[pkg.id] = match.sellingPrice.toFixed(2);
            } else if (next[pkg.id] === undefined) {
              next[pkg.id] = pkg.cost.toFixed(2);
            }
          }
          return next;
        });
      }
    } catch {
      // non-blocking
    }
  }, [packages]);

  const visible = React.useMemo(() => {
    return [...packageList]
      .filter((p) => filter === "ALL" || p.network === filter)
      .sort((a, b) => {
        if (filter === "ALL" && a.network !== b.network) {
          return a.network.localeCompare(b.network);
        }
        return a.gbAmount - b.gbAmount;
      });
  }, [packageList, filter]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function savePrice(packageId: string) {
    const val = parseFloat(prices[packageId] || "0");
    if (isNaN(val) || val <= 0) {
      setMsg({ kind: "err", text: "Please enter a valid retail price" });
      return;
    }
    setSavingId(packageId);
    setMsg(null);
    try {
      const currentProd = byId.get(packageId);
      const res = await fetch("/api/storefront/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          sellingPrice: val,
          isActive: currentProd?.isActive ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save retail price");
      setMsg({ kind: "ok", text: "Product retail price calibrated and live." });
      setProductList((prev) => {
        const next = prev.filter((p) => p.packageId !== packageId);
        next.push({
          packageId,
          sellingPrice: data.product.sellingPrice / 100,
          isActive: data.product.isActive,
        });
        return next;
      });
      setPrices((prev) => ({ ...prev, [packageId]: (data.product.sellingPrice / 100).toFixed(2) }));
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to save retail price" });
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(packageId: string, isActive: boolean) {
    const currentPrice = parseFloat(prices[packageId] || "0") || (byId.get(packageId)?.sellingPrice ?? 0);
    setTogglingId(packageId);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          sellingPrice: currentPrice,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update package state");
      setProductList((prev) => {
        const next = prev.filter((p) => p.packageId !== packageId);
        next.push({
          packageId,
          sellingPrice: data.product.sellingPrice / 100,
          isActive: data.product.isActive,
        });
        return next;
      });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to update package state" });
    } finally {
      setTogglingId(null);
    }
  }

  async function applyBulk() {
    setBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageIds: [...selected], markupPercent: parseFloat(bulkMarkup || "0") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk calibration failed");
      setMsg({ kind: "ok", text: `Updated ${data.updated} product packages across storefront` });
      setSelected(new Set());
      await refreshData();
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Bulk calibration failed" });
    } finally {
      setBulkBusy(false);
    }
  }

  async function syncWithPricingProfile(markupGHS = 0) {
    setSyncingProfile(true);
    setMsg(null);
    try {
      const res = await fetch("/api/storefront/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup: markupGHS }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to sync pricing profile");

      if (Array.isArray(data.packages)) {
        setPackageList(data.packages);
      }
      if (Array.isArray(data.products)) {
        const prods: Prod[] = data.products.map((p: any) => ({
          packageId: p.packageId,
          sellingPrice: p.sellingPrice / 100,
          isActive: p.isActive,
        }));
        setProductList(prods);
        const pkgs = data.packages || packageList;
        setPrices(
          Object.fromEntries(
            pkgs.map((pkg: Pkg) => {
              const match = prods.find((pr) => pr.packageId === pkg.id);
              return [pkg.id, (match ? match.sellingPrice : pkg.cost).toFixed(2)];
            })
          )
        );
      }
      setMsg({
        kind: "ok",
        text: `✓ Successfully synced all ${data.updated ?? ""} storefront products with your current pricing profile rates!`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-bold ${
            msg.kind === "ok"
              ? "border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {msg.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{msg.text}</span>
        </div>
      )}
      {disabled && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold text-amber-300">
          <AlertCircle className="h-4 w-4" />
          <span>Your reseller storefront is inactive — pricing matrix is operating in read-only mode.</span>
        </div>
      )}

      {/* Bulk Markup Command Deck */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#00df82]/30 bg-[#00df82]/10 p-2.5 text-[#00df82]">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Batch Margin Calibration</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Apply a uniform profit markup on top of your wholesale cost for all checked packages.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => syncWithPricingProfile(0)}
              disabled={syncingProfile || disabled}
              className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-4 text-xs font-black shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              title="Sync all products with your current pricing profile rates"
            >
              {syncingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              ) : (
                <RefreshCw className="h-4 w-4 text-cyan-400" />
              )}
              <span>Sync with My Pricing Profile</span>
            </button>

            <div className="relative flex-1 sm:flex-none">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">GHS</span>
              <input
                value={bulkMarkup}
                onChange={(e) => setBulkMarkup(e.target.value)}
                placeholder="2.00"
                inputMode="decimal"
                className="h-10 w-full sm:w-28 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-11 pr-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none"
              />
            </div>
            <button
              onClick={applyBulk}
              disabled={bulkBusy || selected.size === 0 || disabled}
              className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[#00df82] px-4 text-xs font-black text-[#060b13] shadow-md shadow-[#00df82]/20 hover:bg-[#00df82]/90 disabled:opacity-40 transition cursor-pointer whitespace-nowrap"
            >
              {bulkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Apply to ({selected.size}) Selected</span>
            </button>
          </div>
        </div>
      </div>

      {/* Network Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
        {["MTN", "TELECEL", "AIRTELTIGO"].map((n) => {
          const isActive = filter === n;
          return (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#00df82] text-[#060b13] shadow-md shadow-[#00df82]/20"
                  : "border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => {
          const prod = byId.get(p.id);
          const rawPrice = prices[p.id];
          const hasInput = rawPrice !== undefined && rawPrice.trim() !== "";
          const priceNum = hasInput ? parseFloat(rawPrice) : NaN;
          const markup = !isNaN(priceNum)
            ? priceNum - p.cost
            : prod
            ? prod.sellingPrice - p.cost
            : null;
          return (
            <ProductCard
              key={p.id}
              pkg={p}
              prod={prod}
              price={prices[p.id] ?? ""}
              onPriceChange={(v) => setPrices((s) => ({ ...s, [p.id]: v }))}
              onSave={() => savePrice(p.id)}
              onToggleActive={() => prod && toggleActive(p.id, !prod.isActive)}
              checked={selected.has(p.id)}
              onSelect={() => toggle(p.id)}
              markup={markup}
              minMarkup={minMarkup}
              maxMarkup={maxMarkup}
              isSaving={savingId === p.id}
              isToggling={togglingId === p.id}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  pkg,
  prod,
  price,
  onPriceChange,
  onSave,
  onToggleActive,
  checked,
  onSelect,
  markup,
  minMarkup,
  maxMarkup,
  isSaving,
  isToggling,
  disabled,
}: {
  pkg: Pkg;
  prod?: Prod;
  price: string;
  onPriceChange: (v: string) => void;
  onSave: () => void;
  onToggleActive: () => void;
  checked: boolean;
  onSelect: () => void;
  markup: number | null;
  minMarkup: number;
  maxMarkup: number | null;
  isSaving: boolean;
  isToggling: boolean;
  disabled: boolean;
}) {
  const isBusy = disabled || isSaving || isToggling;

  return (
    <div
      className={`rounded-3xl border p-5 transition-all duration-200 shadow-xl ${
        checked
          ? "border-[#00df82] bg-white dark:bg-[#0b1322] ring-1 ring-[#00df82]/30"
          : "border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${NETWORK_STYLES[pkg.network] ?? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
          {pkg.network}
        </span>
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={onSelect}
            disabled={isBusy}
            className="rounded border-slate-300 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] text-[#00df82] focus:ring-0"
          />
          <span className="text-[11px] uppercase tracking-wider">Select</span>
        </label>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{pkg.gbAmount} GB</p>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          Wholesale: <strong className="text-slate-700 dark:text-slate-200">GHS {pkg.cost.toFixed(2)}</strong>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400 dark:text-slate-500">GHS</span>
          <input
            value={price ?? ""}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            disabled={isBusy}
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#070d18] pl-12 pr-3 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[#00df82] focus:outline-none"
          />
        </div>
        <button
          onClick={onSave}
          disabled={isBusy}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#00df82] px-4 text-xs font-black text-[#060b13] hover:bg-[#00df82]/90 disabled:opacity-40 transition shadow-md shadow-[#00df82]/20"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>Save</span>
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-200 dark:border-[#162740]/60 pt-3 text-xs">
        <span
          className={`font-mono text-xs font-bold ${
            markup != null && markup < 0
              ? "text-red-500 dark:text-red-400"
              : "text-emerald-600 dark:text-[#00df82]"
          }`}
        >
          {markup != null
            ? markup < 0
              ? `Below cost: -GHS ${Math.abs(markup).toFixed(2)}`
              : `Profit: +GHS ${markup.toFixed(2)}`
            : "Unpublished"}
        </span>
        {prod && (
          <button
            onClick={onToggleActive}
            disabled={isBusy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
              prod.isActive
                ? "border border-[#00df82]/30 bg-[#00df82]/10 text-[#00df82]"
                : "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#070d18] text-slate-600 dark:text-slate-400"
            }`}
          >
            {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className={`h-1.5 w-1.5 rounded-full ${prod.isActive ? "bg-[#00df82]" : "bg-slate-400 dark:bg-slate-500"}`} />
            <span>{prod.isActive ? "Listed" : "Hidden"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
