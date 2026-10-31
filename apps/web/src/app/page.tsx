import { ArrowRight, Bot, CalendarCheck2, MapPinned, ShieldCheck } from "lucide-react";

import { SiteShell } from "@/components/layout/site-shell";
import { buttonVariants } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const capabilities = [
  {
    icon: Bot,
    title: "Intelligent itineraries",
    description: "Grounded travel plans shaped around time, interests, and real constraints.",
  },
  {
    icon: CalendarCheck2,
    title: "Integrated booking",
    description: "A transactional path from verified availability to reservation and payment.",
  },
  {
    icon: ShieldCheck,
    title: "Travel with confidence",
    description: "Secure vouchers, clear ownership, and dependable inventory safeguards.",
  },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute -left-36 bottom-0 h-72 w-72 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.16em] text-cyan-800 shadow-sm">
            <MapPinned className="size-4" aria-hidden="true" />
            AI-POWERED SMART TRAVEL
          </div>
          <h1 className="mt-8 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            Every beautiful journey starts with a dependable plan.
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
            ADORA brings discovery, itinerary intelligence, real inventory, and booking into one
            calm travel experience built for Vietnam.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#platform" className={cn(buttonVariants({ size: "lg" }), "group")}>
              Explore the platform
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
            <span className="text-sm text-slate-500">Phase 1.0 foundation is running.</span>
          </div>
        </div>
      </section>

      <section id="platform" className="border-t border-slate-200 bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.16em] text-cyan-700">ONE TRAVEL SYSTEM</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Designed around the whole trip, not disconnected transactions.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 text-xs text-slate-400">Configured API endpoint: {API_BASE_URL}</p>
        </div>
      </section>
    </SiteShell>
  );
}
