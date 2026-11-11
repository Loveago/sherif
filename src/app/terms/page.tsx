import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Server,
  CreditCard,
  Ban,
  Scale,
  Users,
  Store,
  Clock,
  Layers,
  Phone,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — CleanDataPacks",
  description:
    "Terms of Service governing data bundle dispatch, agent and reseller storefronts, system verification, and platform usage on CleanDataPacks.com.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      currentSlug="terms"
      title="Terms of Service"
      badge="Legal Agreement"
      lastUpdated="Last Updated: 1st October, 2026"
      description="These Terms of Service govern your access to and use of CleanDataPacks.com, our telecommunication distribution platform, APIs, and reseller storefronts under the laws of the Republic of Ghana."
    >
      <div className="space-y-10 text-slate-700 dark:text-slate-300">
        {/* Preamble / Introduction */}
        <section className="space-y-3">
          <p className="text-base leading-relaxed">
            Welcome to <strong className="text-slate-900 dark:text-white">CleanDataPacks.com</strong> (&quot;CleanDataPacks,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of our website, services, APIs, and storefront platforms (collectively, the &quot;Services&quot;).
          </p>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">Binding Agreement:</span> By creating an account, making a purchase, or using our Services, you agree to be bound by these Terms and the laws of the Republic of Ghana. If you do not agree with any part of these Terms, please discontinue use of the platform immediately.
          </div>
        </section>

        {/* Section 1 */}
        <section id="services" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Radio className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Description of Services
            </h2>
          </div>
          <p className="text-sm sm:text-base leading-relaxed pl-12">
            CleanDataPacks.com operates a telecommunication digital distribution platform in Ghana, providing data bundle delivery for supported mobile network operators, including <strong className="text-slate-900 dark:text-white">MTN Ghana</strong>, <strong className="text-slate-900 dark:text-white">Telecel Ghana</strong>, and <strong className="text-slate-900 dark:text-white">AT (AirtelTigo)</strong>. We operate as an independent aggregator and technology intermediary.
          </p>
        </section>

        {/* Section 2 */}
        <section id="accounts" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. User Accounts &amp; Membership Tiers
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Standard Accounts
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Every customer registering on CleanDataPacks.com is initially assigned the status of a Standard User, usage for direct usage of purchased bundle.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-500" />
                Tier Upgrades
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Users may request an account upgrade to specialized tiers (e.g., Agent, Reseller). Upgrades are approved at our sole discretion based on eligibility requirements. Upgraded tiers unlock wholesale pricing, specialized dashboard tools, and extended features.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-500" />
                Account Responsibility
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="storefronts" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Store className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Agent &amp; Reseller Storefronts
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>
              Agents and Resellers may generate customized storefronts through CleanDataPacks.com to sell data bundles directly to third-party end-users.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>
                <strong className="text-slate-900 dark:text-white">Independent Seller Capacity:</strong> Resellers act as independent sellers and are solely responsible for setting compliant end-user prices within allowed parameters, managing their direct customer relationships, and addressing preliminary customer inquiries.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Anti-Misrepresentation Clause:</strong> Resellers may not misrepresent themselves as the official mobile network operators (MTN, Telecel, AT) or as sole owners of CleanDataPacks.com.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section id="verification" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Recipient Number Verification &amp; Order Acceptance
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 dark:border-amber-500/20 dark:bg-amber-950/20 space-y-2">
              <h3 className="font-bold text-amber-900 dark:text-amber-300">
                System Verification Requirement
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Our platform operates a closed-loop validation safeguard. Data bundles can only be dispatched to phone numbers that are verified and active on the CleanDataPacks system.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Automatic Rejection
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                If a customer or storefront buyer submits an unverified, malformed, or unlisted phone number, the transaction will be automatically rejected by our system before order completion, and no payment will be accepted or captured.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Accuracy of Information
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                For verified numbers, the buyer remains responsible for ensuring the selected network matches the phone number. Dispatches made to a verified number mistakenly designated by the customer cannot be undone.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="payments" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Payments &amp; Pricing
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>
              All payments on CleanDataPacks.com are set to be processed securely in Ghana Cedis (GHS) via licensed third-party payment gateways, including <strong className="text-slate-900 dark:text-white">Paystack</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>
                <strong className="text-slate-900 dark:text-white">Zero Credential Storage:</strong> We do not store credit/debit card numbers or Mobile Money PINs on our servers.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Dynamic Pricing:</strong> Prices for data bundles are subject to real-time adjustments based on operator tariff updates, wholesale costs, and platform tier status.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section id="delivery" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Delivery Timelines &amp; Network Outages
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-white">Express Delivery:</strong> Under normal conditions, data bundle top-ups are automated and processed instantly or within minutes.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Third-Party Dependency:</strong> Service delivery relies directly on the gateway infrastructure and network APIs of telecommunication operators (MTN, Telecel, AT). CleanDataPacks is not liable for delayed dispatches caused by telecommunication network outages, API downtime, or maintenance windows.
            </p>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                Reporting Delays (24-Hour Notice):
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
                If a bundle is marked as paid but not credited to the recipient&apos;s line, the user must log a support ticket within twenty-four (24) hours. We will investigate with the designated operator and ensure dispatch or issue a resolution.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7 */}
        <section id="prohibited" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Ban className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              7. Prohibited Use
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>You agree not to use the Services for:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>Any fraudulent, unauthorized, or illegal transactions.</li>
              <li>
                Exploiting system vulnerabilities, automated scraping, or bot-driven purchases without API authorization.
              </li>
              <li>
                Distributing malicious storefront links or conducting unauthorized financial activities.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 8 */}
        <section id="liability" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              8. Limitation of Liability &amp; Governing Law
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>
              To the maximum extent permitted by Ghanaian law, CleanDataPacks.com will not be liable for any indirect, incidental, or consequential damages resulting from network delays or operator-level errors.
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">
              These Terms are governed by and construed in accordance with the laws of the Republic of Ghana.
            </p>
          </div>
        </section>

        {/* Section 9 */}
        <section id="contact" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Phone className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              9. Contact &amp; Customer Support
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              For legal inquiries, terms clarification, or customer support regarding order dispatch, reach out to our team:
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Official Email</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm break-all">
                  <a href="mailto:support@cleandatapacks.com" className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    support@cleandatapacks.com
                  </a>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone / WhatsApp</span>
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
