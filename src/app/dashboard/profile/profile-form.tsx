"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, UserRound, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/toast";

interface Initial {
  name: string;
  email: string;
  phone: string;
}

export function ProfileForms({ initial }: { initial: Initial }) {
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwError, setPwError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        return setPwError("Enter your current password to set a new one.");
      }
      if (newPassword.length < 8) {
        return setPwError("New password must be at least 8 characters.");
      }
      if (newPassword !== confirmPassword) {
        return setPwError("New password and confirmation do not match.");
      }
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { name, email, phone };
      if (newPassword) {
        body.newPassword = newPassword;
        body.currentPassword = currentPassword;
      }
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) return toast(json.error ?? "Update failed", "error");
      toast(
        newPassword
          ? "Profile & password updated — other sessions signed out"
          : "Profile updated successfully",
        "success"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-10 rounded-xl border-slate-200/90 bg-slate-50/50 text-sm font-medium focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-white/5";

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Account details */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserRound className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Account Details</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your primary identification and contact information
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Full Name
            </Label>
            <Input
              id="name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="0241234567"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Used for account verification, urgent delivery alerts, and billing receipts.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Password */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Security &amp; Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave blank if you do not wish to change your existing password
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="currentPassword"
              className="text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new"
              className={inputCls}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {pwError && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:border-rose-500/30 dark:text-rose-400">
            {pwError}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
          <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>For security purposes, updating your password will automatically sign out any other active sessions.</span>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-white/5">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-[#00df82] to-[#00b568] px-6 py-2.5 font-black text-slate-950 shadow-md shadow-[#00df82]/20 hover:from-[#00f58f] hover:to-[#00c873] transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}