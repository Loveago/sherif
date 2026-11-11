"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatGHS, formatDateTime } from "@/lib/types";
import {
  Users,
  Pencil,
  PlusCircle,
  MinusCircle,
  Ticket,
  Snowflake,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Clock,
  Copy,
  Check,
  Wallet,
  TrendingUp,
} from "lucide-react";

function CopyRefButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy reference"
      className="inline-flex items-center p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  balance: number;
  pricingProfileId: string | null;
  _count: { orders: number };
  lastLoginAt: string | null;
  signupCodeUsage?: {
    signupCode: { code: string };
    usedAt: string;
  } | null;
  registrationPayment?: {
    id: string;
    reference: string | null;
    amount: number;
    status: string;
    note: string | null;
    paidAt: string | null;
    createdAt: string;
  } | null;
}

export function AdminUsersTable({
  data,
  loading,
  selectedIds = [],
  onSelect,
  onSelectAll,
  currentUserId,
  onEdit,
  onViewSales,
  onManualCredit,
  onManualDebit,
  onToggleFreeze,
  onActivate,
  onDelete,
}: {
  data: UserRow[];
  loading: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  currentUserId?: string;
  onEdit: (u: UserRow) => void;
  onViewSales?: (u: UserRow) => void;
  onManualCredit?: (u: UserRow) => void;
  onManualDebit?: (u: UserRow) => void;
  onToggleFreeze?: (u: UserRow) => void;
  onActivate?: (u: UserRow) => void;
  onDelete?: (u: UserRow) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12 rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {data.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <>
          {/* Mobile / Small Screen Card View (< lg) */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {onSelectAll && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={onSelectAll}
                    aria-label="Select all users"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>Select All Users ({data.length})</span>
                </label>
                {selectedIds.length > 0 && (
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {selectedIds.length} selected
                  </span>
                )}
              </div>
            )}

            {data.map((u) => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={`p-4 space-y-3 transition ${
                    isSelected ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                  }`}
                >
                  {/* Card Header: Checkbox + Avatar + Name + Badges + Edit Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {onSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelect(u.id)}
                          aria-label={`Select ${u.name}`}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    {/* Prominent Edit Profile Button on mobile card header */}
                    <Button
                      size="sm"
                      onClick={() => onEdit(u)}
                      className="shrink-0 h-8 px-3 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-2xs cursor-pointer"
                      title="Edit user profile"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {/* Status */}
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : u.status === "FROZEN"
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20"
                            : u.status === "PENDING_PAYMENT"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                      >
                        {u.status === "FROZEN" && <Snowflake className="h-3 w-3 animate-pulse" />}
                        {u.status === "PENDING_PAYMENT" && <Clock className="h-3 w-3" />}
                        {u.status === "PENDING_PAYMENT" ? "Awaiting Payment" : u.status}
                      </span>
                    </div>

                    {/* Wallet Balance */}
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Wallet Balance</span>
                      <Link
                        href={`/admin/wallets?userId=${u.id}`}
                        className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{formatGHS(u.balance)}</span>
                      </Link>
                    </div>

                    {/* Registration Fee */}
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 col-span-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Registration / Fee</span>
                      {u.registrationPayment ? (
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          {u.registrationPayment.status === "APPROVED" ? (
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                              title={u.registrationPayment.paidAt ? `Paid on ${formatDateTime(u.registrationPayment.paidAt)}` : undefined}
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" /> Paid {formatGHS(u.registrationPayment.amount)}
                            </span>
                          ) : u.registrationPayment.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                              <Clock className="h-2.5 w-2.5" /> Pending {formatGHS(u.registrationPayment.amount)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                              {u.registrationPayment.status}
                            </span>
                          )}
                          {u.registrationPayment.reference && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              <span className="truncate max-w-[140px]" title={u.registrationPayment.reference}>
                                {u.registrationPayment.reference}
                              </span>
                              <CopyRefButton text={u.registrationPayment.reference} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Exempt / Free</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Action Buttons Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {onViewSales && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewSales(u)}
                        className="h-8 px-2.5 text-xs font-semibold text-brand-700 border-brand-200 bg-brand-50/50 hover:bg-brand-100 dark:bg-brand-950/30 dark:border-brand-800 dark:text-brand-400"
                        title="View user sales analytics"
                      >
                        <TrendingUp className="h-3 w-3 mr-1 text-brand-600 dark:text-brand-400" /> Sales
                      </Button>
                    )}
                    {onManualCredit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManualCredit(u)}
                        className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                        title="Manual wallet credit"
                      >
                        <PlusCircle className="h-3 w-3 mr-1 text-emerald-600" /> Credit
                      </Button>
                    )}
                    {onManualDebit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManualDebit(u)}
                        className="h-8 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                        title="Manual wallet debit"
                      >
                        <MinusCircle className="h-3 w-3 mr-1 text-rose-600 dark:text-rose-400" /> Debit
                      </Button>
                    )}
                    {onToggleFreeze && u.role !== "ADMIN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleFreeze(u)}
                        className={`h-8 px-2.5 text-xs font-semibold ${
                          u.status === "FROZEN"
                            ? "text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            : "text-cyan-600 border-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
                        }`}
                        title={u.status === "FROZEN" ? "Unfreeze user account" : "Freeze user account"}
                      >
                        <Snowflake className="h-3 w-3 mr-1" />
                        {u.status === "FROZEN" ? "Unfreeze" : "Freeze"}
                      </Button>
                    )}
                    {onActivate && u.status === "PENDING_PAYMENT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActivate(u)}
                        className="h-8 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400 shadow-sm"
                        title="Activate awaiting payment account"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        Activate
                      </Button>
                    )}
                    {onDelete && u.id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(u)}
                        className="h-8 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/30 ml-auto"
                        title="Delete user account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / Large Screen Table View (lg+) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  {onSelectAll && (
                    <th className="w-10 px-3 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={data.length > 0 && selectedIds.length === data.length}
                        onChange={onSelectAll}
                        aria-label="Select all users"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">User</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Registration / Ref</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Balance</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Signup Code</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Orders</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Last Login</th>
                  {/* Sticky Actions Header pinned to the right edge */}
                  <th className="sticky right-0 z-20 bg-white dark:bg-slate-900 px-4 py-3 text-right font-semibold whitespace-nowrap shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.4)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((u) => {
                  const isSelected = selectedIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`group transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        isSelected ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                      }`}
                    >
                      {onSelect && (
                        <td className="w-10 px-3 py-3 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(u.id)}
                            aria-label={`Select ${u.name}`}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {u.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{u.role}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : u.status === "FROZEN"
                              ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20"
                              : u.status === "PENDING_PAYMENT"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {u.status === "FROZEN" && <Snowflake className="h-3 w-3 animate-pulse" />}
                          {u.status === "PENDING_PAYMENT" && <Clock className="h-3 w-3" />}
                          {u.status === "PENDING_PAYMENT" ? "Awaiting Payment" : u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.registrationPayment ? (
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <div>
                              {u.registrationPayment.status === "APPROVED" ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                  title={u.registrationPayment.paidAt ? `Paid on ${formatDateTime(u.registrationPayment.paidAt)}` : undefined}
                                >
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Paid {formatGHS(u.registrationPayment.amount)}
                                </span>
                              ) : u.registrationPayment.status === "PENDING" ? (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                  <Clock className="h-2.5 w-2.5" /> Pending {formatGHS(u.registrationPayment.amount)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                  {u.registrationPayment.status}
                                </span>
                              )}
                            </div>
                            {u.registrationPayment.reference && (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                <span
                                  className="truncate max-w-[125px]"
                                  title={u.registrationPayment.note || u.registrationPayment.reference}
                                >
                                  {u.registrationPayment.reference}
                                </span>
                                <CopyRefButton text={u.registrationPayment.reference} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Exempt / Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        <Link
                          href={`/admin/wallets?userId=${u.id}`}
                          className="inline-flex items-center gap-1.5 hover:underline group/w"
                          title="Inspect user wallet balance and activity ledger"
                        >
                          <Wallet className="h-3.5 w-3.5 text-emerald-500 opacity-70 group-hover/w:opacity-100 transition-opacity" />
                          <span>{formatGHS(u.balance)}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {u.signupCodeUsage?.signupCode?.code ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded">
                            <Ticket className="h-3 w-3" /> {u.signupCodeUsage.signupCode.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {onViewSales ? (
                          <button
                            type="button"
                            onClick={() => onViewSales(u)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 group/o"
                            title="Click to view sales summary for this user"
                          >
                            <TrendingUp className="h-3 w-3 opacity-60 group-hover/o:opacity-100 transition-opacity" />
                            <span>{u._count.orders}</span>
                          </button>
                        ) : (
                          u._count.orders
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                      </td>

                      {/* Sticky Actions Column on Desktop */}
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 px-4 py-3 text-right shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.4)] whitespace-nowrap">
                        <div className="flex justify-end gap-1.5 items-center">
                          {/* EDIT PROFILE BUTTON FIRST AND PROMINENT */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(u)}
                            className="h-7 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                            title="Edit user profile"
                          >
                            <Pencil className="h-3 w-3 mr-1 text-brand-600 dark:text-brand-400" /> Edit
                          </Button>

                          {/* USER SALES SUMMARY BUTTON */}
                          {onViewSales && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewSales(u)}
                              className="h-7 text-xs font-semibold text-brand-700 border-brand-200 bg-brand-50/50 hover:bg-brand-100 dark:bg-brand-950/30 dark:border-brand-800 dark:text-brand-400"
                              title="View user sales summary"
                            >
                              <TrendingUp className="h-3 w-3 mr-1 text-brand-600 dark:text-brand-400" /> Sales
                            </Button>
                          )}

                          {onManualCredit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onManualCredit(u)}
                              className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                              title="Manual wallet credit"
                            >
                              <PlusCircle className="h-3 w-3 text-emerald-600" /> Credit
                            </Button>
                          )}
                          {onManualDebit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onManualDebit(u)}
                              className="h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                              title="Manual wallet debit"
                            >
                              <MinusCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" /> Debit
                            </Button>
                          )}
                          {onActivate && u.status === "PENDING_PAYMENT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onActivate(u)}
                              className="h-7 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400 shadow-sm"
                              title="Activate awaiting payment account"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                              Activate
                            </Button>
                          )}
                          {onToggleFreeze && u.role !== "ADMIN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onToggleFreeze(u)}
                              className={`h-7 text-xs ${
                                u.status === "FROZEN"
                                  ? "text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                  : "text-cyan-600 border-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
                              }`}
                              title={u.status === "FROZEN" ? "Unfreeze user account" : "Freeze user account"}
                            >
                              <Snowflake className="h-3 w-3" />
                              {u.status === "FROZEN" ? "Unfreeze" : "Freeze"}
                            </Button>
                          )}
                          {onDelete && u.id !== currentUserId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(u)}
                              className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                              title="Delete user account"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
