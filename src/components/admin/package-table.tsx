"use client";

import { EmptyState, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/types";
import { Package, Pencil, Power, Trash2 } from "lucide-react";
import type { AdminPackage } from "@/components/admin/package-form-dialog";

export function PackageTable({
  packages,
  loading,
  onEdit,
  onDelete,
  onToggle,
}: {
  packages: AdminPackage[];
  loading: boolean;
  onEdit: (p: AdminPackage) => void;
  onDelete: (p: AdminPackage) => void;
  onToggle: (p: AdminPackage) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12 rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  const sortedPackages = [...packages].sort((a, b) => {
    if (a.network !== b.network) return a.network.localeCompare(b.network);
    return a.gbAmount - b.gbAmount;
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {sortedPackages.length === 0 ? (
        <EmptyState icon={Package} title="No packages" description="Add your first data bundle." />
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {sortedPackages.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {p.network}
                      </span>
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {p.gbAmount} GB
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {p.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500">Retail Price:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {p.retailPriceGHS != null ? formatGHS(p.retailPriceGHS) : "—"}
                  </span>
                </div>

                {p.providerProductId && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Provider ID:</span>
                    <span className="font-mono text-[11px]">{p.providerProductId}</span>
                  </div>
                )}

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => onEdit(p)}
                    className="flex-1 h-8 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-2xs cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit Package
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggle(p)}
                    className="h-8 px-3 text-xs font-semibold"
                    title={p.active ? "Hide package" : "Enable package"}
                  >
                    <Power className={`h-3 w-3 mr-1 ${p.active ? "text-emerald-600" : "text-slate-400"}`} />
                    {p.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(p)}
                    className="h-8 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
                    title="Delete package"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Package</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Network</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Size</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Retail price</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell whitespace-nowrap">Provider ID</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="sticky right-0 z-20 bg-white dark:bg-slate-900 px-4 py-3 text-right font-semibold whitespace-nowrap shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.4)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedPackages.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.network}</td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{p.gbAmount}GB</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {p.retailPriceGHS != null ? formatGHS(p.retailPriceGHS) : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell whitespace-nowrap font-mono text-xs">
                      {p.providerProductId ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {p.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 px-4 py-3 text-right shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.4)] whitespace-nowrap">
                      <div className="flex justify-end gap-1.5 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(p)}
                          className="h-7 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                          title="Edit package"
                        >
                          <Pencil className="h-3 w-3 mr-1 text-brand-600 dark:text-brand-400" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToggle(p)}
                          className="h-7 text-xs"
                          title={p.active ? "Hide this package from users" : "Make this package available to users"}
                        >
                          <Power className={`h-3.5 w-3.5 ${p.active ? "text-emerald-600" : "text-slate-400"}`} />
                          {p.active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(p)}
                          className="h-7 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
                          title="Delete package"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
