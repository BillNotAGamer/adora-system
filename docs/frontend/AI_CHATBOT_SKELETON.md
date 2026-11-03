# AI Chatbot Interface Skeleton

`apps/web/src/app/ai-planner/page.tsx` is a static Next.js App Router Server Component. It presents:

- a desktop sidebar with ADORA identity, disabled new-conversation control, placeholder history,
  and profile area;
- an assistant header that explicitly says AI is not connected;
- static greeting and Da Lat suggestion cards;
- a disabled prompt input and send button; and
- a reduced mobile layout with no horizontal content dependency on the hidden sidebar.

The landing page and shared navigation link to `/ai-planner`. Static data is hoisted outside the
component; direct icon imports and Tailwind classes avoid extra client libraries or runtime state.
Controls have accessible labels and titles, and the disabled prompt explicitly states that no
message is sent.

There is no Gemini dependency, model call, chat API, streaming, state machine, conversation
persistence, local storage, fake generated response, or catalog integration. Visual polish and all
chat functionality are deferred.
