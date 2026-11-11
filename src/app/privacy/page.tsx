import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  ShieldCheck,
  Database,
  Lock,
  Share2,
  FileText,
  UserCheck,
  Mail,
  Phone,
  Server,
  Building,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — CleanDataPacks",
  description:
    "Privacy Policy and data governance compliance under the Data Protection Act, 2012 (Act 843) of Ghana for CleanDataPacks.com users, agents, and buyers.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      currentSlug="privacy"
      title="Privacy Policy"
      badge="Data Protection Act (Act 843)"
      lastUpdated="Last Updated: 1st October, 2026"
      description="CleanDataPacks.com is committed to safeguarding your personal data in full compliance with the Data Protection Act, 2012 (Act 843) of the Republic of Ghana."
    >
      <div className="space-y-10 text-slate-700 dark:text-slate-300">
        {/* Preamble */}
        <section className="space-y-3">
          <p className="text-base leading-relaxed">
            <strong className="text-slate-900 dark:text-white">CleanDataPacks.com</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is dedicated to protecting your personal information. This Privacy Policy outlines our data handling practices in compliance with the <strong className="text-slate-900 dark:text-white">Data Protection Act, 2012 (Act 843) of Ghana</strong>.
          </p>
        </section>

        {/* Section 1 */}
        <section id="collection" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Information We Collect
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>We collect the following personal and transactional details:</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Account Information</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Name, email address, phone number, and account tier credentials (for Users, Agents, and Resellers).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Order &amp; Recipient Data</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Phone numbers submitted for data bundle top-ups, transaction amounts, carrier selection (MTN, Telecel, AT), and status logs.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Verification Data</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Data used to authenticate authorized phone numbers within our delivery database.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Technical Data</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  IP address, browser type, device information, and transaction timestamps collected automatically via system logs and cookies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="usage" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. How We Use Your Information
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>We use your data strictly to:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>Verify recipient phone numbers and execute data bundle orders.</li>
              <li>Communicate order statuses, platform updates, and technical notifications.</li>
              <li>Authenticate user accounts, manage Reseller/Agent storefronts, and prevent fraudulent transactions.</li>
              <li>Comply with Ghanaian financial record-keeping standards and anti-fraud regulations.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section id="sharing" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Share2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Data Sharing &amp; Third Parties
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <strong className="text-emerald-900 dark:text-emerald-300">Privacy Guarantee:</strong> We do not sell, rent, or trade your personal information. We only share information with trusted third parties necessary to provide our services.
            </div>

            <ul className="list-disc pl-5 space-y-3 text-slate-600 dark:text-slate-400">
              <li>
                <strong className="text-slate-900 dark:text-white">Mobile Network Operators (MTN Ghana, Telecel Ghana, AirtelTigo):</strong> Recipient phone numbers and purchase specifications are shared to provision data bundles.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Payment Processors (Paystack):</strong> Payment card details and Mobile Money details are handled directly by Paystack via encrypted, PCI-DSS compliant interfaces. CleanDataPacks does not store your payment PINs or card credentials.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Regulatory &amp; Law Enforcement Authorities:</strong> Only when mandated by Ghanaian law, court order, or an official regulatory directive.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section id="security" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Data Security &amp; Storage
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>
                All communications between your browser and our website are protected using <strong className="text-slate-900 dark:text-white">TLS/HTTPS 256-bit encryption</strong>.
              </li>
              <li>
                Internal access to customer databases and verification lists is strictly role-restricted to authorized technical personnel.
              </li>
              <li>
                Transactional records are retained only for the duration required by Ghanaian tax, accounting, and anti-fraud compliance mandates.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section id="rights" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Your Rights Under Act 843 (Ghana)
            </h2>
          </div>
          <div className="pl-12 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>
              Under the <strong className="text-slate-900 dark:text-white">Data Protection Act, 2012 (Act 843)</strong>, you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>Access the personal information we hold about you.</li>
              <li>Request the correction of inaccurate or incomplete contact details.</li>
              <li>
                Request the deactivation of your account and deletion of your records, subject to statutory transaction retention periods.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section id="contact" className="space-y-4 border-t border-slate-200/80 pt-8 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Contact Information
            </h2>
          </div>
          <div className="pl-12 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              For inquiries regarding these policies or to exercise your privacy rights, please contact our data governance desk:
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Designated Entity</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  CleanDataPacks
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Republic of Ghana</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Privacy &amp; Compliance Email</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm break-all">
                  <a href="mailto:sherifbraimah1@gmail.com" className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    sherifbraimah1@gmail.com
                  </a>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-slate-950/40 space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer Support Desk</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  <a href="https://wa.me/233242075374" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    0242075374
                  </a>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">+233 24 207 5374</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
