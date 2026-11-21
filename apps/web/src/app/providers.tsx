"use client";
import '@/components/concierge/concierge.css';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ConciergeProvider } from "@/components/concierge/concierge-provider";
import { ConciergeFloatingTrigger } from "@/components/concierge/concierge-floating-trigger";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}><ConciergeProvider>{children}<ConciergeFloatingTrigger /></ConciergeProvider></QueryClientProvider>;
}
