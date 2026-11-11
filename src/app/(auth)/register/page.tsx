"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { BrandMark } from "@/components/brand-logo";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/shared";
import {
  User,
  Mail,
  Lock,
  Ticket,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

interface SignupFeeInfo {
  enabled: boolean;
  amount: number;
  currency: string;
  description: string;
  paystackConfigured: boolean;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signupCodeMode, setSignupCodeMode] = useState<"DISABLED" | "OPTIONAL" | "REQUIRED">("OPTIONAL");
  const [codeStatus, setCodeStatus] = useState<{ checked: boolean; valid: boolean; message?: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [signupFee, setSignupFee] = useState<SignupFeeInfo | null>(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [redirectingPayment, setRedirectingPayment] = useState<{ url: string; amount: number } | null>(null);

  // Check for affiliate referral link parameters
  const rawRef =
    searchParams.get("ref") ||
    searchParams.get("code") ||
    searchParams.get("aff") ||
    searchParams.get("affiliate") ||
    searchParams.get("invite") ||
    "";
  const refParam = rawRef.trim();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      signupCode: refParam,
      ref: refParam,
    },
  });

  // Autofill signupCode and ref when an affiliate / invite code is in URL
  useEffect(() => {
    if (refParam) {
      setValue("ref", refParam);
      setValue("signupCode", refParam);
    }
  }, [refParam, setValue]);

  const enteredCode = watch("signupCode");

  // Load registration settings
  useEffect(() => {
    fetch("/api/auth/registration-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.signupCodeMode) setSignupCodeMode(data.signupCodeMode);
        if (data.allowRegistration === false) setRegistrationClosed(true);
        if (data.signupFee) setSignupFee(data.signupFee);
      })
      .catch(() => {
        fetch("/api/auth/signup-code-mode")
          .then((r) => r.json())
          .then((data) => {
            if (data.mode) setSignupCodeMode(data.mode);
          })
          .catch(() => {});
      });
  }, []);

  // Handle URL errors (e.g. redirected from Paystack callback on cancel/failure)
  useEffect(() => {
    const error = searchParams.get("error");
    const reason = searchParams.get("reason");
    const message = searchParams.get("message");
    if (error === "payment_failed") {
      setServerError(
        reason
          ? `Payment failed: ${reason}. Please try signing up again to complete activation.`
          : "Payment was not completed. Please try again to activate your account."
      );
    } else if (error === "verification_error") {
      setServerError(message || "An error occurred while verifying your payment. Please try again.");
    } else if (error === "transaction_not_found") {
      setServerError("Registration transaction record not found. Please try submitting again.");
    }
  }, [searchParams]);

  // Validate signup / affiliate code with debounce
  useEffect(() => {
    const codeToValidate = enteredCode?.trim();
    if (!codeToValidate) {
      setCodeStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingCode(true);
      try {
        const res = await fetch(`/api/auth/validate-code?code=${encodeURIComponent(codeToValidate)}`);
        const data = await res.json();
        setCodeStatus({
          checked: true,
          valid: !!data.valid,
          message: data.valid
            ? data.message || "✓ Valid signup code"
            : data.message || "Invalid or expired signup code",
        });
      } catch {
        setCodeStatus(null);
      } finally {
        setValidatingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [enteredCode]);

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Registration failed");
        return;
      }

      // Check if account monetization fee payment is required
      if (json.requiresPayment && json.authorizationUrl) {
        setRedirectingPayment({
          url: json.authorizationUrl,
          amount: json.amount || signupFee?.amount || 0,
        });
        toast("Account registered! Redirecting to Paystack for activation...", "info");
        setTimeout(() => {
          window.location.href = json.authorizationUrl;
        }, 1000);
        return;
      }

      toast("Account created. Welcome to CleanDataPacks!", "success");
      window.location.href = "/dashboard";
    } catch {
      setServerError("An unexpected connection error occurred. Please try again.");
    }
  };

  const hasFee = signupFee?.enabled && signupFee.amount > 0;

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand Logo matching LoginPage */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandMark size="lg" className="shadow-2xl shadow-indigo-500/30 mb-2" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              CLEAN<span className="text-emerald-600 dark:text-[#00df82]">DATAPACKS</span>
            </span>
            <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-[#00df82] border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
              TELECOM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Telecom Wholesale &amp; Reseller Engine</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">Create your account</h2>
        </div>

        {/* Register Form Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#0a1220]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          {/* Payment Redirecting Modal / Prompt */}
          {redirectingPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0a1220] p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-[#14233a] text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                  <Spinner className="h-7 w-7 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Redirecting to Paystack…</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Complete the activation fee of{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                      GHS {redirectingPayment.amount.toFixed(2)}
                    </strong>{" "}
                    to activate your account and access your dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = redirectingPayment.url;
                  }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Proceed to Paystack</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {registrationClosed ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center text-xs text-amber-800 dark:text-amber-200 space-y-2">
              <AlertTriangle className="mx-auto h-7 w-7 text-amber-500 dark:text-amber-400" />
              <p className="font-bold text-amber-600 dark:text-amber-300 text-sm">Registrations are currently closed</p>
              <p className="text-slate-500 dark:text-slate-400">
                New user sign-ups are temporarily paused by the administrator. Please check back later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register("ref")} />

              {/* Server Error Alert */}
              {serverError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300">
                  {serverError}
                </div>
              )}

              {/* Affiliate Referral Indicator */}
              {refParam && (
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Referred by Partner Agent</span>
                  <span className="font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-md">
                    {refParam}
                  </span>
                </div>
              )}

              {/* Activation Fee Banner */}
              {hasFee && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 text-xs text-indigo-900 dark:text-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                      <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      {signupFee.description || "Account Activation Fee"}
                    </span>
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      GHS {signupFee.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    A one-time activation fee is required. You will be redirected to Paystack after submission.
                  </p>
                </div>
              )}

              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Full Name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("name")}
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Kwame Mensah"
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {errors.name && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400">{errors.name.message}</p>
                )}
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
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
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
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

              {/* Signup / Affiliate Invite Code Input */}
              {signupCodeMode !== "DISABLED" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {signupCodeMode === "REQUIRED" ? (
                        <span>
                          Signup / Invite Code <span className="text-rose-500 dark:text-rose-400">*</span>
                        </span>
                      ) : (
                        <span>
                          Signup / Invite Code{" "}
                          <span className="text-slate-500 font-normal text-[10px]">(Optional)</span>
                        </span>
                      )}
                    </label>
                    {validatingCode && <Spinner className="h-3.5 w-3.5 text-[#00df82]" />}
                  </div>
                  <div className="relative">
                    <Ticket className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      {...register("signupCode")}
                      type="text"
                      placeholder="e.g. AGENT-123 or WELCOME2026"
                      className="w-full h-11 rounded-xl bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a] pl-10 pr-4 uppercase tracking-wider font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  {codeStatus?.checked && (
                    <p
                      className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                        codeStatus.valid ? "text-[#00df82]" : "text-rose-500 dark:text-rose-400"
                      }`}
                    >
                      {codeStatus.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{codeStatus.message}</span>
                    </p>
                  )}
                  {errors.signupCode && (
                    <p className="text-[10px] text-rose-500 dark:text-rose-400">{errors.signupCode.message}</p>
                  )}
                </div>
              )}

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-3 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    <span>Creating account...</span>
                  </>
                ) : hasFee ? (
                  <>
                    <span>Create Account &amp; Pay GHS {signupFee.amount.toFixed(2)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Terms & Conditions Notice */}
              <p className="text-center text-[10px] text-slate-500 leading-relaxed pt-1">
                By registering, you agree to our{" "}
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
          )}

          {/* Footer Link to Login */}
          <div className="text-center pt-2 border-t border-slate-200 dark:border-[#14233a]">
            <span className="text-xs text-slate-500 dark:text-slate-400">Already have an account? </span>
            <Link
              href="/login"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign in
            </Link>
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f6fa] dark:bg-[#060b13] flex justify-center items-center">
          <Spinner className="h-8 w-8 text-indigo-500" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
