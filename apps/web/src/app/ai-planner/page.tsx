import { Bot, Compass, Menu, MessageSquarePlus, Send, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

const previewConversations = ["Da Lat weekend", "Coastal escape ideas", "Family trip outline"];

export default function AiPlannerPreview() {
  return (
    <main className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 text-slate-950">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-5 text-white md:flex">
        <Link href="/" className="flex items-center gap-3" aria-label="Return to ADORA home">
          <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-600 text-sm font-black">
            A
          </span>
          <span>
            <span className="block text-base font-bold tracking-[0.16em]">ADORA</span>
            <span className="text-xs text-slate-400">Travel intelligence</span>
          </span>
        </Link>

        <button
          type="button"
          disabled
          className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300"
          title="Conversation creation is planned for a future phase"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          New conversation
        </button>

        <section className="mt-8" aria-labelledby="history-heading">
          <h2 id="history-heading" className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Preview history
          </h2>
          <ul className="mt-3 space-y-1">
            {previewConversations.map((conversation) => (
              <li key={conversation} className="truncate rounded-lg px-3 py-2 text-sm text-slate-400">
                {conversation}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-800 pt-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-medium">Traveler preview</span>
            <span className="text-xs text-slate-500">Profile area</span>
          </span>
        </div>
      </aside>

      <section className="flex w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        <header className="flex min-h-18 min-w-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-7">
          <button
            type="button"
            disabled
            className="flex size-10 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 text-slate-500 md:hidden"
            aria-label="Sidebar preview is unavailable on small screens"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">ADORA AI Travel Assistant</h1>
            <p className="truncate text-xs text-slate-500 sm:text-sm">Interface preview · AI is not connected</p>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-7 lg:px-12">
          <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center py-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-sm">
                <Bot className="size-6" aria-hidden="true" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.15em] text-cyan-700">Planning preview</p>
              <h2 className="mt-3 max-w-full break-words text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Where would you like to travel?
              </h2>
              <p className="mt-4 max-w-2xl break-words leading-7 text-slate-600">
                This future assistant will help shape destinations, timing, and travel preferences into a practical trip plan.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Compass className="size-5 text-cyan-700" aria-hidden="true" />
                  <p className="mt-4 text-sm font-medium">Plan a 3-day trip to Da Lat.</p>
                </div>
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Sparkles className="size-5 text-amber-600" aria-hidden="true" />
                  <p className="mt-4 text-sm font-medium">Suggest a calm food and nature itinerary.</p>
                </div>
              </div>

              <div className="mt-8 w-full max-w-xl break-words rounded-2xl rounded-tl-md bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-200">
                Hello! I&apos;m the structural preview of ADORA&apos;s travel assistant. Live planning and generated replies will arrive in a future phase.
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-100 pb-5 pt-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg shadow-slate-200/60">
                <label htmlFor="trip-prompt" className="sr-only">Trip description preview</label>
                <input
                  id="trip-prompt"
                  type="text"
                  disabled
                  placeholder="Describe your dream trip..."
                  className="min-w-0 flex-1 cursor-not-allowed bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  disabled
                  className="flex size-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 text-slate-500"
                  aria-label="Send is unavailable in this interface preview"
                  title="AI messaging is not implemented in Phase 1.2"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">Static interface preview — no message will be sent.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
