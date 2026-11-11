"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { BrandMark } from "@/components/brand-logo";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session_expired") === "1";
  const nextParam = searchParams.get("next");

  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otpTicket, setOtpTicket] = useState<string>("");
  const [otpEmail, setOtpEmail] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>("");
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);

  useEffect(() => {
    if (sessionExpired) {
      // Clear legacy/stale client cookies
      document.cookie = "cleandatapacks_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "crazytech_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "commontech_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "mycedinet_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "tskconnect_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
  }, [sessionExpired]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Login failed");
        return;
      }

      if (json.requireOtp) {
        setStep("otp");
        setOtpTicket(json.otpTicket);
        setOtpEmail(json.email);
        if (json.devOtp) setDevOtp(json.devOtp);
        toast("One-Time Passcode sent to your email", "info");
        return;
      }

      toast("Signed in successfully", "success");
      const destination = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
      window.location.href = destination;
    } catch {
      setServerError("An unexpected connection error occurred. Please try again.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast("Please enter the 6-digit code", "error");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpTicket, code: otpCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "OTP verification failed", "error");
        return;
      }
      toast("Signed in successfully", "success");
      const destination = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
      window.location.href = destination;
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandMark size="lg" className="shadow-2xl shadow-indigo-500/30 mb-2" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              CRAZY<span className="text-indigo-600 dark:text-indigo-400">TECH</span>
            </span>
            <span className="rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
              TELECOM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Telecom Wholesale &amp; Reseller Engine</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">Sign in to your account</h2>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#0a1220]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          {sessionExpired && !serverError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>Your session has expired or was reset. Please sign in again.</span>
            </div>
          )}

          {serverError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300">
              {serverError}
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] pl-10 pr-10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400">{errors.password.message}</p>
                )}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Terms, Privacy & Refund Agreement */}
              <p className="text-center text-[10px] text-slate-500 leading-relaxed pt-1">
                By signing in, you agree to our{" "}
                <Link href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Terms of Service
                </Link>
                ,{" "}
                <Link href="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link href="/refund-policy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Refund Policy
                </Link>
                .
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <div className="inline-flex p-3 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enter Security Code</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Check <span className="text-slate-900 dark:text-white font-semibold">{otpEmail}</span> for your 6-digit passcode.
                </p>
                {devOtp && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                    Development OTP: <strong>{devOtp}</strong>
                  </div>
                )}
              </div>

              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full h-12 text-center text-xl font-mono tracking-widest rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length !== 6}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {verifyingOtp ? <Spinner className="h-4 w-4" /> : <span>Verify &amp; Enter Dashboard</span>}
              </button>
            </div>
          )}

          {/* Footer Link */}
          <div className="text-center pt-2 space-y-2 border-t border-slate-200 dark:border-[#14233a]">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Don't have an account? </span>
              <Link
                href="/register"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>

        {/* Global Legal & Compliance Links */}
        <footer className="text-center space-y-2 pt-1 pb-4">
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Link
              href="/privacy"
              className="hover:text-slate-900 dark:hover:text-white transition-colors hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link
              href="/terms"
              className="hover:text-slate-900 dark:hover:text-white transition-colors hover:underline"
            >
              Terms of Service
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link
              href="/refund-policy"
              className="hover:text-slate-900 dark:hover:text-white transition-colors hover:underline"
            >
              Refund Policy
            </Link>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} CleanDataPacks. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] flex items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
