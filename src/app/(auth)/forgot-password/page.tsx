"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type LoginInput } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { AuthShell, AuthFooterLink } from "@/components/auth/auth-shell";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [resetPath, setResetPath] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: { email: string }) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setSent(true);
    if (json.resetPath) setResetPath(json.resetPath);
    toast("If that email exists, a reset link has been sent.", "success");
  };

  return (
    <AuthShell title="Forgot password" subtitle="We'll send you a reset link">
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            Check your inbox for the reset link.
          </div>
          {resetPath && (
            <a
              href={resetPath}
              className="block text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Open reset link (dev)
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-slate-200">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 sm:h-12 rounded-xl bg-slate-950/70 border-white/15 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-all"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-400 font-medium">{errors.email.message}</p>}
          </div>
          <Button
            type="submit"
            className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] transition-all text-sm sm:text-base tracking-wide"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner className="h-5 w-5 text-slate-950" /> : "Send Reset Link"}
          </Button>
        </form>
      )}
      <AuthFooterLink href="/login" prompt="Remember your password?" cta="Sign in" />
    </AuthShell>
  );
}
