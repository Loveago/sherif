"use client";

import * as React from "react";
import Link from "next/link";
import {
  Code2,
  Smartphone,
  Palette,
  Globe,
  Layers,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Zap,
  Clock,
  MessageCircle,
  Cpu,
  Laptop,
  Server,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WHATSAPP_RAW = "233242075374";
const PHONE_DISPLAY = "024 207 5374";
const PHONE_INTL = "+233 24 207 5374";

// Authentic WhatsApp SVG Icon
function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
}

interface ServiceItem {
  id: string;
  category: "software" | "app" | "graphic" | "web" | "api";
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  features: string[];
  technologies: string[];
  whatsappMessage: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "software-development",
    category: "software",
    title: "Software Development",
    subtitle: "Custom Enterprise & Business Software",
    badge: "Primary Service",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    gradient: "from-indigo-600 via-blue-600 to-cyan-500",
    icon: Laptop,
    description:
      "Bespoke software systems engineered to streamline your business operations, automate workflows, and boost productivity. From inventory systems to full-scale SaaS platforms.",
    features: [
      "Custom Enterprise Software & ERP Systems",
      "Point-of-Sale (POS) & Inventory Management",
      "School, Hospital & Business Management Systems",
      "Desktop & Cross-Platform Applications",
      "Automated Reporting, PDF Invoicing & Analytics",
      "Full Source Code Ownership & Deployment Support",
    ],
    technologies: ["React", "Next.js", "Node.js", "Python", "PostgreSQL", "Electron", "Docker"],
    whatsappMessage:
      "Hello Admin, I am interested in Software Development from CleanDataPacks. I would like to discuss my business software requirements.",
  },
  {
    id: "app-development",
    category: "app",
    title: "Mobile App Development",
    subtitle: "High-Performance iOS & Android Apps",
    badge: "High Demand",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: Smartphone,
    description:
      "Stunning, native and cross-platform mobile apps for Android and iOS. Built with seamless user experiences, instant Mobile Money checkout, and push notifications.",
    features: [
      "Native & Cross-Platform (Android & iOS)",
      "Google Play Store & Apple App Store Publishing",
      "MTN MoMo, Telecel Cash & Paystack In-App Payments",
      "Instant Push Notifications & Offline Synchronization",
      "User Authentication, OTPs & Social Logins",
      "6-Month Free Post-Launch Maintenance & Bug Fixes",
    ],
    technologies: ["Flutter", "React Native", "Swift", "Kotlin", "Firebase", "REST APIs"],
    whatsappMessage:
      "Hello Admin, I would like to build a Mobile App (iOS / Android) with CleanDataPacks. Please let me know how we can get started.",
  },
  {
    id: "graphic-design",
    category: "graphic",
    title: "Graphic Designing & Branding",
    subtitle: "Eye-Catching Visuals & Brand Identity",
    badge: "Creative Studio",
    badgeColor: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30",
    gradient: "from-pink-500 via-rose-500 to-amber-500",
    icon: Palette,
    description:
      "Transform your business image with high-converting creative designs. From unforgettable brand logos to professional promo flyers, social media kits, and corporate profiles.",
    features: [
      "Professional Logo Design & Complete Brand Identity",
      "Social Media Flyers, Banners & Motion Graphics",
      "Company Profiles, Brochures & Annual Reports",
      "Product Packaging & Label Designs",
      "Ultra-HD Print-Ready Vectors (AI, PSD, PDF, PNG)",
      "Fast 24-48h Turnaround with Iterative Revisions",
    ],
    technologies: ["Photoshop", "Illustrator", "Figma", "InDesign", "After Effects"],
    whatsappMessage:
      "Hello Admin, I need Graphic Designing & Brand Identity services from CleanDataPacks. Can you share packages and pricing?",
  },
  {
    id: "web-development",
    category: "web",
    title: "Web Development & Portals",
    subtitle: "Modern Websites & Reseller Portals",
    badge: "Lightning Fast",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    gradient: "from-blue-600 via-indigo-600 to-purple-600",
    icon: Globe,
    description:
      "Blazing-fast modern websites, e-commerce storefronts, and automated reseller portals tailored for maximum sales conversions and top Google search rankings.",
    features: [
      "Custom Data & Airtime Reseller Portals",
      "Modern Corporate & Business Websites",
      "E-Commerce Stores with Local Payment Gateways",
      "100% Mobile Responsive & Modern UI/UX",
      "SEO Optimization & Free Google Analytics Setup",
      "Free Cloud Hosting Setup & SSL Encryption",
    ],
    technologies: ["Next.js", "Tailwind CSS", "TypeScript", "Prisma", "PostgreSQL", "Vercel"],
    whatsappMessage:
      "Hello Admin, I am looking to develop a Website or Web Portal with CleanDataPacks. I would like to discuss details.",
  },
  {
    id: "ui-ux-design",
    category: "software",
    title: "UI/UX & Product Design",
    subtitle: "User-Centered Wireframes & Prototypes",
    badge: "Pixel Perfect",
    badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    gradient: "from-purple-600 via-fuchsia-600 to-pink-500",
    icon: Layers,
    description:
      "User-centric product designs that captivate your customers. We design clean, modern mobile and web interfaces with clickable prototypes ready for developer handoff.",
    features: [
      "Interactive Clickable Prototypes in Figma",
      "User Journey Mapping & Information Architecture",
      "Scalable Design Systems & Component Libraries",
      "Comprehensive Mobile & Web App Wireframes",
      "Developer-Ready Design Handoff & Asset Export",
    ],
    technologies: ["Figma", "FigJam", "Adobe XD", "Protopie"],
    whatsappMessage:
      "Hello Admin, I am interested in UI/UX and Product Design services from CleanDataPacks for my upcoming project.",
  },
  {
    id: "api-integrations",
    category: "api",
    title: "API Integrations & Fintech",
    subtitle: "Payment Gateways, SMS & Automation",
    badge: "99.9% Reliability",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    icon: Cpu,
    description:
      "Connect your existing platforms with Ghanaian Mobile Money networks, Paystack checkout, Bulk SMS delivery gateways, and robust webhook infrastructures.",
    features: [
      "MTN MoMo, Telecel Cash & AT Money Gateway Setup",
      "Paystack & Hubtel Custom Integration",
      "Bulk SMS Gateway & Automated SMS Alerts",
      "Webhook Dispatch Systems with Instant Retries",
      "High-Volume Transaction Queues & Monitoring",
    ],
    technologies: ["REST APIs", "Webhooks", "MoMo API", "Paystack", "Node.js", "Python"],
    whatsappMessage:
      "Hello Admin, I would like to integrate Payment Gateways / Bulk SMS APIs into my platform. Please guide me through.",
  },
];

export function OtherServicesView() {
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [copied, setCopied] = React.useState(false);

  // Quick inquiry customizer state
  const [selectedService, setSelectedService] = React.useState(SERVICES_DATA[0].title);
  const [clientName, setClientName] = React.useState("");
  const [clientNote, setClientNote] = React.useState("");

  const handleCopyPhone = () => {
    navigator.clipboard.writeText("0242075374");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredServices = React.useMemo(() => {
    if (activeFilter === "all") return SERVICES_DATA;
    if (activeFilter === "software") return SERVICES_DATA.filter((s) => s.category === "software");
    if (activeFilter === "app") return SERVICES_DATA.filter((s) => s.category === "app");
    if (activeFilter === "graphic") return SERVICES_DATA.filter((s) => s.category === "graphic");
    if (activeFilter === "web") return SERVICES_DATA.filter((s) => s.category === "web");
    if (activeFilter === "api") return SERVICES_DATA.filter((s) => s.category === "api");
    return SERVICES_DATA;
  }, [activeFilter]);

  const handleCustomWhatsAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let text = `Hello Admin, my name is ${clientName.trim() || "a Client"}.\nI am reaching out regarding *${selectedService}* from CleanDataPacks.`;
    if (clientNote.trim()) {
      text += `\n\n*Project Details:*\n${clientNote.trim()}`;
    }
    text += `\n\nPlease let me know your availability to discuss further.`;

    const url = `https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-7 pb-12">
      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#14233a] bg-gradient-to-br from-indigo-950 via-[#0a1426] to-[#040810] text-white p-6 sm:p-8 lg:p-10 shadow-2xl">
        {/* Glow Spheres */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#00df82]/15 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3.5 py-1 text-xs font-bold text-cyan-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#00df82]" />
            <span>CleanDataPacks · Professional Digital Solutions</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Software, Mobile Apps &amp; <br />
            <span className="bg-gradient-to-r from-[#00df82] via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Creative Tech Services
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Beyond airtime and data bundles, CleanDataPacks delivers high-impact custom software,
            native mobile applications, corporate graphic design, websites, and fintech API
            integrations. Tap below to chat directly with our admin on WhatsApp.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={`https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(
                "Hello Admin, I am exploring your services (Software, App Development, Graphic Design). I would like to get in touch!"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 px-5 py-3 text-xs sm:text-sm font-black shadow-lg shadow-[#25D366]/30 transition-all active:scale-95 group"
            >
              <WhatsAppIcon className="h-4 w-4 fill-slate-950" />
              <span>Contact Admin on WhatsApp</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>

            <button
              type="button"
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 text-white px-4 py-3 text-xs sm:text-sm font-bold backdrop-blur-md transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#00df82]" />
                  <span className="text-[#00df82]">Copied 0242075374!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-300" />
                  <span>Copy Number: 024 207 5374</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Floating Quick Trust Stats */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 mt-6 border-t border-white/10 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Response Time</div>
            <div className="font-mono font-bold text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00df82] animate-pulse" />
              <span>&lt; 15 Minutes</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Admin WhatsApp</div>
            <div className="font-mono font-bold text-[#00df82]">{PHONE_INTL}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Location</div>
            <div className="font-bold text-white">Ghana &amp; Global Remote</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Code Quality</div>
            <div className="font-bold text-white">100% Tested &amp; Deployed</div>
          </div>
        </div>
      </div>

      {/* ── TOP STICKY WHATSAPP CONTACT CARD ─────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-[#071714] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-slate-950 shadow-md shadow-[#25D366]/20">
            <WhatsAppIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Chat Directly with CleanDataPacks Admin
              </h3>
              <span className="rounded-full bg-[#00df82]/20 border border-[#00df82]/40 text-[#00df82] px-2 py-0.5 text-[10px] font-black uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Ghana Admin Line:{" "}
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {PHONE_DISPLAY} ({PHONE_INTL})
              </span>{" "}
              · Instant quotes &amp; project consultations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <a
            href={`https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(
              "Hello Admin! I would like to inquire about your services."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 px-4 py-2 text-xs font-black shadow-sm transition-all active:scale-95"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>Chat on WhatsApp</span>
          </a>

          <a
            href="tel:+233242075374"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#1a2f4c] bg-white dark:bg-[#0d1c30] text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white px-3.5 py-2 text-xs font-bold transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5 text-cyan-400" />
            <span>Call Admin</span>
          </a>

          <button
            type="button"
            onClick={handleCopyPhone}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#1a2f4c] bg-white dark:bg-[#0d1c30] text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white px-3 py-2 text-xs font-bold transition-colors"
            title="Copy WhatsApp number"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#00df82]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* ── FILTER TABS ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#14233a] pb-3 overflow-x-auto scrollbar-none gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: "All Services" },
            { id: "software", label: "Software Development" },
            { id: "app", label: "Mobile Apps" },
            { id: "graphic", label: "Graphic Design" },
            { id: "web", label: "Websites & Portals" },
            { id: "api", label: "Fintech & APIs" },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0a1220]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-slate-400 shrink-0 font-medium hidden md:inline">
          Showing {filteredServices.length} specialized services
        </span>
      </div>

      {/* ── SERVICES GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service, idx) => {
          const Icon = service.icon;
          const waUrl = `https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(
            service.whatsappMessage
          )}`;

          return (
            <div
              key={service.id}
              className="group relative rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#0a1220] p-6 shadow-xl hover:shadow-2xl hover:border-indigo-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header: Icon + Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr text-white shadow-lg",
                      service.gradient
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      service.badgeColor
                    )}
                  >
                    {service.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {service.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {service.description}
                </p>

                {/* Key Features Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#14233a]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    What is Included:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {service.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00df82] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technologies Stack */}
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {service.technologies.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="rounded-lg bg-slate-100 dark:bg-[#0e192c] border border-slate-200 dark:border-[#162740] px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button: Directly Links to WhatsApp */}
              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-[#14233a] space-y-2">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs py-3 px-4 shadow-md shadow-[#25D366]/20 transition-all active:scale-95 group/btn"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Contact Admin on WhatsApp</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </a>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                  <span>Number: 0242075374</span>
                  <span className="text-[#00df82] font-semibold">Fast Quote</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HOW WE WORK SECTION ──────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#0a1220] p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00df82]">
            Simple 4-Step Process
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            How We Bring Your Vision To Life
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Transparent communication, clean code, and fast delivery from consultation to launch.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "01",
              title: "WhatsApp Consultation",
              desc: "Reach out to Admin at 0242075374 with your ideas or requirements. We discuss possibilities and timeline.",
            },
            {
              step: "02",
              title: "Quote & Architecture",
              desc: "We provide an itemized quote, technical roadmap, and clear deliverables tailored to your budget.",
            },
            {
              step: "03",
              title: "Agile Development",
              desc: "We develop your software, app, or branding with regular progress previews and interactive updates.",
            },
            {
              step: "04",
              title: "Testing & Deployment",
              desc: "Full quality assurance, live store publishing or cloud hosting, followed by post-launch support.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-[#14233a] bg-slate-50 dark:bg-[#070d18] p-4 space-y-2 relative"
            >
              <div className="font-mono text-2xl font-black text-[#00df82]/40">{item.step}</div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CUSTOM PROJECT INQUIRY FORM / WHATSAPP LAUNCHER ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Form that formats message directly into WhatsApp */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-[#14233a] bg-white dark:bg-[#0a1220] p-6 sm:p-7 shadow-xl space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
              Instant WhatsApp Request
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Request a Custom Quote
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fill in your project details below and click Send. It will open WhatsApp with your
              pre-filled request ready to send to our admin!
            </p>
          </div>

          <form onSubmit={handleCustomWhatsAppSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Service
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#0e192c] px-3 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                >
                  {SERVICES_DATA.map((s) => (
                    <option key={s.id} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                  <option value="Other Custom Tech Request">Other Custom Tech Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Name / Business
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Mensah / TechCorp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#0e192c] px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Project Overview &amp; Requirements (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Describe what you want to build, key features, target deadline, or any questions..."
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-[#162740] bg-slate-50 dark:bg-[#0e192c] p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs sm:text-sm py-3.5 shadow-lg shadow-[#25D366]/25 transition-all active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>Open in WhatsApp &amp; Send to Admin (0242075374)</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Right: Why Choose CleanDataPacks Card */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-[#14233a] bg-gradient-to-br from-slate-900 via-[#071324] to-[#040810] text-white p-6 sm:p-7 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#00df82] text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>CleanDataPacks Guarantee</span>
            </div>

            <h4 className="text-xl font-black">
              Why Partner With Us For Your Tech &amp; Creative Needs?
            </h4>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#00df82] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Full Source Code &amp; IP Ownership</div>
                  <div className="text-slate-400 mt-0.5">
                    You 100% own all source code, assets, database, and deployments.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#00df82] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Ghanaian MoMo &amp; Local Integrations</div>
                  <div className="text-slate-400 mt-0.5">
                    Native expertise with MTN MoMo, Telecel Cash, and local payment rails.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#00df82] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Direct Admin WhatsApp Communication</div>
                  <div className="text-slate-400 mt-0.5">
                    No automated ticket bots. Talk directly to experienced engineers.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs">
              <div className="text-slate-400">Need Immediate Help?</div>
              <div className="font-bold text-white font-mono">{PHONE_INTL}</div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_RAW}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00df82] hover:underline"
            >
              <span>Chat now</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
