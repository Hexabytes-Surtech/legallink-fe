'use client';

import { Navbar } from '@/components/shared/navbar';
import { AiChat } from '@/components/features/ai-chat';

// Public, anonymous-friendly entry to the conversational assistant. Self-contained
// full-height shell (Navbar + chat) — no footer, so the chat behaves like an app.
// Registration is only required at the "connect with an advocate" step.
export default function AssistantPage() {
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <div className="min-h-0 flex-1">
        <AiChat className="h-full" autoFocus />
      </div>
    </div>
  );
}
