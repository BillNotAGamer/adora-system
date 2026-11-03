import Link from "next/link";

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="ADORA home">
            <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-700 text-sm font-black text-white">
              A
            </span>
            <span className="text-lg font-bold tracking-[0.16em] text-slate-950">ADORA</span>
          </Link>
          <nav aria-label="Primary navigation" className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
            <a href="#platform" className="transition-colors hover:text-cyan-800">
              Platform
            </a>
            <Link href="/ai-planner" className="transition-colors hover:text-cyan-800">
              AI planner
            </Link>
            <span className="hidden text-slate-400 sm:inline">Customer + Admin</span>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-slate-950 px-6 py-8 text-sm text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>ADORA · Smart Travel Platform</span>
          <span>Catalog foundation · Phase 1.2</span>
        </div>
      </footer>
    </div>
  );
}
