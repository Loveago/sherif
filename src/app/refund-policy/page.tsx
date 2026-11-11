import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  RotateCcw,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Wallet,
  CreditCard,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy — CleanDataPacks",
  description:
    "Refund and Cancellation Policy for data bundle top-ups, unverified recipient numbers, wallet reversals, and MoMo disputes on CleanDataPacks.com.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      currentSlug="refund-policy"
      title="Refund &amp; Cancellation Policy"
      badge="Consumer Protection"
      lastUpdated="Last Updated: 1st October, 2026"
      description="Because telecommunication data bundles are digital services fulfilled and consumed immediately upon transfer, this policy outlines the conditions under which transactions may be cancelled, escalated, or refunded."
    >
      <div className="space-y-10 text-slate-700 dark:text-slate-300">
        {/* Preamble */}
        <section className="space-y-3">
          <p className="text-base leading-relaxed">
            At <strong className="text-slate-900 dark:text-white">CleanDataPacks.com</strong>, we strive to provide reliable and automated data bundle delivery. Because data bundles are digital services consumed immediately upon transfer, this Refund and Cancellation Policy outlines the conditions under which transactions may be cancelled or refunded.
          </p>
        </section>

        {/* Section 1 */}
        <section id="failed-deliveries" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Failed Deliveries &amp; Network Delays
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Automated Escalation
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                If you make a successful payment, but the data bundle is not delivered due to a network timeout, operator API disruption, or system error, you must notify customer support via your dashboard ticket or our official support channels within <strong className="text-slate-900 dark:text-white">twenty-four (24) hours</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-500" />
                Resolution Period
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Our technical team will investigate the transaction with the designated mobile network operator (<strong className="text-slate-900 dark:text-white">MTN</strong>, <strong className="text-slate-900 dark:text-white">Telecel</strong>, or <strong className="text-slate-900 dark:text-white">AT</strong>). We will attempt to resolve the issue and manually push the data delivery within <strong className="text-slate-900 dark:text-white">12 to 24 hours</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20 space-y-1.5">
              <h3 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Refund Trigger
              </h3>
              <p className="text-emerald-950 dark:text-emerald-200 text-sm">
                If the network provider confirms delivery failure or if the bundle cannot be delivered within 24 hours from when the issue is logged, you are entitled to a <strong className="text-emerald-950 dark:text-white">full refund</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="unverified-numbers" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. Unverified Numbers
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>
              Orders to unverified numbers are systematically blocked before processing.
            </p>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-relaxed dark:border-cyan-500/20 dark:bg-cyan-950/20">
              <span className="font-semibold text-cyan-900 dark:text-cyan-300">Latency Anomaly Protection:</span> In the rare event that a payment gateway pre-authorizes or debits funds for an unverified recipient number due to a latency error, our system will automatically flag the anomaly, and a <strong className="text-cyan-950 dark:text-white">full refund will be processed immediately</strong>.
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="non-refundable" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Non-Refundable Transactions
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>Refunds will not be granted under the following circumstances:</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Successful Dispatch
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  The data bundle has already been successfully delivered and confirmed by the telecommunication network&apos;s SMS or API response.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Customer Entry Error
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You entered a verified number belonging to another person by mistake, and the network successfully delivered the bundle to that recipient.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Telco-Side Line Ineligibility
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  The recipient number is barred, suspended, or inactive by the carrier&apos;s network policies.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Change of Mind
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You change your mind after the payment has been captured and the bundle has been queued or delivered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="timelines" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Refund Methods &amp; Timelines
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" />
                Wallet Credit
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                For registered users, agents, and resellers, refunds are typically credited to your CleanDataPacks account wallet <strong className="text-slate-900 dark:text-white">instantly upon approval</strong>, enabling immediate re-orders without delay.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-500" />
                Original Payment Method (Paystack / Mobile Money)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                If a customer requests a reversal directly back to their original Mobile Money wallet or bank card, the refund will be initiated via <strong className="text-slate-900 dark:text-white">Paystack</strong>. Gateway reversals typically reflect within <strong className="text-slate-900 dark:text-white">24 to 48 hours</strong>, subject to standard Mobile Money network and banking clearing times.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="dispute-resolution" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Phone className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Dispute Resolution
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              If you have an unresolved issue, please reach out directly to our dedicated support operations before filing a payment dispute with your payment provider:
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Support Email</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm break-all">
                  <a href="mailto:sherifbraimah1@gmail.com" className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    sherifbraimah1@gmail.com
                  </a>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">WhatsApp / Phone</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  <a href="https://wa.me/233242075374" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    0242075374
                  </a>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">+233 24 207 5374</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Operating Hours</span>
                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  5:00 AM – 11:59 PM GMT
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Monday – Sunday</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
