# LegalLink — Frontend

AI-powered, anonymous, **bilingual (English / বাংলা)** legal-aid platform for West Bengal.
Citizens describe a legal problem in plain language → an AI brief cites real Indian statutes →
they connect with **Bar Council–verified advocates**, chat in real time, book consultations, and
leave feedback. Advocates manage requests/availability; admins verify advocates and moderate chat.

This app is the **client** for the LegalLink backend. It is matched end-to-end to the backend
contract documented in [`../FRONTEND_INTEGRATION_GUIDE.md`](../FRONTEND_INTEGRATION_GUIDE.md).

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, React 19.2) |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js`) |
| Components | Hand-built **Shadcn-style** primitives (Radix UI) + **Aceternity-style** showpieces |
| Theming | `next-themes` — **dual theme**: "wow dark" (default) + "premium light" |
| Animation | `motion` (Framer Motion successor), tasteful scroll-reveals & micro-interactions |
| Real-time | `socket.io-client` (consultation chat) |
| Icons / toasts | `lucide-react` / `sonner` |
| i18n | Lightweight context + key catalog (`src/i18n/config.ts`), EN + BN |

---

## Getting started

```bash
npm install
npm run dev          # dev server (Turbopack) → http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
```

### Environment (`.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api      # backend REST base
NEXT_PUBLIC_WS_URL=http://localhost:4000           # backend Socket.IO origin (namespace /ws)
NEXT_PUBLIC_USE_MOCK=false
```

### Running with live data

The UI renders its loading/empty/error states without a backend, but for real data start the
backend on `:4000` and seed it:

```bash
cd ../legallink-be
npx cross-env NODE_ENV=development node dist/src/main
npx ts-node --transpile-only scripts/seed-min.ts
```

Seeded logins (OTP bypass code **`000000`**): `citizen.a@min.legallink.local`,
`adv.verified@min.legallink.local`, `admin@min.legallink.local`.
The real-time chat + Rule-36 flagged-message flow is best demoed with **two browser sessions**
(citizen + advocate) on an accepted consultation.

---

## Project structure

```
legallink-fe/
├─ .env                       # public env (API + WS URLs)
├─ next.config.ts             # Next config (Turbopack defaults)
├─ eslint.config.mjs
├─ postcss.config.mjs         # @tailwindcss/postcss
├─ tsconfig.json
└─ src/
   ├─ app/                                  # App Router
   │  ├─ layout.tsx                         # root: fonts, <Providers>, <Toaster>
   │  ├─ providers.tsx                      # Theme → Language → Auth providers
   │  ├─ globals.css                        # design tokens (dual theme) + utilities + keyframes
   │  ├─ not-found.tsx                      # branded 404
   │  ├─ error.tsx                          # segment error boundary
   │  ├─ robots.ts / sitemap.ts             # SEO
   │  │
   │  ├─ (public)/                          # unauthenticated area
   │  │  ├─ page.tsx                        # landing (hero, anon intake, features)
   │  │  ├─ (with-nav)/                     # public pages wrapped in Navbar + Footer
   │  │  │  ├─ layout.tsx
   │  │  │  ├─ intake/page.tsx              # dedicated "describe your problem" page
   │  │  │  ├─ matter/[id]/page.tsx         # AI brief + matched advocates + connect
   │  │  │  ├─ advocates/page.tsx           # directory + filters + pagination
   │  │  │  └─ advocates/[id]/page.tsx      # public profile + reviews + availability
   │  │  └─ auth/
   │  │     ├─ layout.tsx                   # centered aurora auth shell
   │  │     ├─ login/page.tsx
   │  │     ├─ signup/page.tsx
   │  │     └─ advocate-signup/page.tsx
   │  │
   │  └─ (protected)/                       # requires auth — <AuthGate> in layout.tsx
   │     ├─ layout.tsx                       # auth guard + global Navbar
   │     ├─ matters/page.tsx                # citizen dashboard (matters × consultations)
   │     ├─ settings/page.tsx               # profile + avatar + language
   │     ├─ chat/                            # messenger (collapsible conversation sidebar)
   │     │  ├─ layout.tsx                    # role-aware conversation list
   │     │  ├─ page.tsx                      # "select a conversation"
   │     │  └─ [consultationId]/page.tsx     # live chat thread
   │     ├─ advocate/                        # advocate console (collapsible sidebar shell)
   │     │  ├─ layout.tsx                    # role guard + sidebar nav
   │     │  ├─ dashboard/page.tsx
   │     │  ├─ consultations/page.tsx        # tabs: requests / active / closed
   │     │  ├─ consultations/[id]/page.tsx   # detail + AI brief + accept/decline
   │     │  ├─ availability/page.tsx         # weekly IST grid editor
   │     │  ├─ profile/page.tsx
   │     │  ├─ documents/page.tsx
   │     │  ├─ reviews/page.tsx
   │     │  └─ onboarding/page.tsx           # 4-step BCI wizard → submit-verification
   │     └─ admin/                           # admin console (collapsible sidebar shell)
   │        ├─ layout.tsx                    # admin role guard + sidebar nav
   │        ├─ page.tsx                       # overview (live queue counts)
   │        ├─ advocates/page.tsx             # verification queue (approve / reject+reason)
   │        └─ messages/page.tsx              # moderation queue (approve / dismiss)
   │
   ├─ components/
   │  ├─ ui/                  # Shadcn-style primitives (own the code, no CLI)
   │  │   button, card, input, textarea, label, badge, skeleton, dialog, tabs,
   │  │   avatar, dropdown-menu, select, tooltip, progress, switch, sheet,
   │  │   separator, sonner, sidebar (collapsible)
   │  ├─ aceternity/          # aurora-background, spotlight, glow-card (theme-aware)
   │  ├─ shared/              # navbar, footer, logo, theme-toggle, language-toggle,
   │  │                       # verification-badge, empty-state, spinner, reveal
   │  ├─ features/            # domain components (see "Key components" below)
   │  └─ theme-provider.tsx
   │
   ├─ contexts/
   │  ├─ AuthContext.tsx      # session: user, accessToken, login/logout, role redirects
   │  └─ LanguageContext.tsx  # language (en|bn) + t() translator
   │
   ├─ hooks/
   │  ├─ index.ts             # barrel
   │  ├─ useApi.ts            # useQuery / useMutation / errorMessage
   │  └─ useChatSocket.ts     # Socket.IO consultation chat
   │
   ├─ lib/
   │  ├─ api/client.ts        # fetch wrapper: envelope, auth, 401-refresh-retry, ApiError
   │  ├─ utils.ts             # cn() (clsx + tailwind-merge)
   │  └─ constants.ts         # practice areas, WB districts, courts, BIO_MAX…
   │
   ├─ i18n/config.ts          # bilingual key catalog + Language/TranslationKey types
   └─ types/index.ts          # all backend response/request shapes (single source)
```

### Route groups & access

- **`(public)`** — no auth. `(with-nav)` adds the marketing Navbar+Footer; `auth/` uses a centered shell.
- **`(protected)`** — `layout.tsx` is an **`AuthGate`**: shows a spinner while the session restores, then
  redirects unauthenticated users to `/auth/login`. Nested `advocate/` and `admin/` layouts add their own
  **role guard** + a collapsible sidebar; `chat/` adds a conversation-list sidebar.

---

## Data flow

### 1. API client (`lib/api/client.ts`)

Every REST call goes through one client that speaks the backend's envelope exactly:

```
success → { success: true,  data, meta }
error   → { success: false, error: { code, message }, meta }   // message: string | string[]
```

- `api.get/post/put/del/upload(...)` → resolves to the **unwrapped `data`**, throws a typed **`ApiError`**
  (`{ code, message, first }`) on failure.
- Always sends cookies (`credentials: 'include'`) for the anonymous-session + refresh-token cookies.
- Injects the access token (`Authorization: Bearer`) from `localStorage`.
- On **401**, transparently calls `/auth/refresh-token` once (single-flight) and retries.
- `apiClient(...)` is a non-throwing variant returning `{ success, data, error }` for inline handling.

### 2. Data fetching (`hooks/useApi.ts`)

Pages never call `fetch` directly. They use:

```ts
const { data, loading, error, refetch } = useQuery(() => api.get<T>('/path'), [deps]);
const { mutate, loading } = useMutation((body) => api.post('/path', body));
```

`loading` drives **skeletons** everywhere; `error` drives empty/error states; mutations toast and `refetch`.

### 3. Auth (`contexts/AuthContext.tsx`)

Two-step OTP (no passwords), handled by `components/features/auth-otp-form.tsx`:

```
register|login {email[,role]}  → 202 (OTP emailed; dev bypass 000000)
verify-otp {email, otp}        → { accessToken, user }   (+ httpOnly refresh cookie)
→ AuthContext.login() persists token+user (localStorage) and redirects by role
  (citizen → /matters · advocate → /advocate/dashboard · admin → /admin)
```

- Anonymous matters are **claimed automatically** by the backend on verify-otp (the session cookie links them).
- `login(tokens, redirectTo)` accepts `redirectTo: false` so the **connect flow** can authenticate *then*
  fire `POST /consultations` before navigating.

### 4. The core citizen journey

```
Landing / Intake  ── POST /matter (anon, session cookie) ──▶  /matter/[id]
   AI brief (polls while status = processing)  +  GET /matter/[id]/advocates
   "Request consultation" → ConnectDialog
        authed citizen → POST /consultations
        anonymous      → inline OTP → claim → POST /consultations
   (optional) pick an IST slot → scheduledAt sent with the request
        ▼
   /matters  (GET /matter ⨯ GET /consultations, merged by matter_id)
   accepted → /chat/[consultationId] · closed → FeedbackDialog
```

### 5. Real-time chat (`hooks/useChatSocket.ts`)

```ts
io(`${NEXT_PUBLIC_WS_URL}/ws`, { query: { token, consultationId }, transports: ['websocket'] })
```

| Event | Direction | Handling |
|---|---|---|
| `history` | in | initial cleared messages |
| `message` | in/out | optimistic echo on send, reconciled when the server echoes |
| `typing`  | in/out | debounced; peer typing indicator |
| `warning` | in | `MESSAGE_FLAGGED` → marks the sender's message "under review" (never broadcast); `CONSULTATION_CLOSED` → read-only |
| `error`   | in | `AUTH_FAILED` / `ACCESS_DENIED` |

### 6. Theming & i18n

- **Theme:** tokens live in `globals.css` (`:root` = light, `.dark` = dark) mapped to Tailwind via
  `@theme inline`. `next-themes` toggles the `.dark` class; default is **dark**. Brand helpers:
  `text-gradient-gold`, `glass` / `glass-strong`, `glow-gold`, `bg-grid`.
- **i18n:** `useLanguage()` exposes `language` + `t(key)`. Keys live in `src/i18n/config.ts` (en + bn).
  Bengali text uses the `font-bn` utility. `LanguageToggle` persists the choice.

---

## Key components (`components/features/`)

| Component | Purpose |
|---|---|
| `matter-intake` | Anonymous chat-bar → `POST /matter` (auto-detects Bengali, remembers matter) |
| `ai-brief` | Renders the AI analysis: classification, EN/BN tabs, procedural/next-steps, citations; handles `processing` / `ai_failed` / `null` |
| `advocate-card` | Directory + match card (rating, verification badge, areas) `+ Skeleton` |
| `connect-dialog` | Request a consultation (authed or inline-OTP), optional scheduling, Rule-36 notice |
| `slot-picker` | Availability → IST slots. **Sends the correct UTC instant** (`new Date(\`${date}T${time}:00+05:30\`).toISOString()`) |
| `booking-dialog` | Reschedule an appointment (`PUT /appointments/:id`) |
| `feedback-dialog` | 1–5 star + comment (`POST /consultations/:id/feedback`) |
| `auth-otp-form` | Two-step OTP (202 / 429 lockout / resend / dev hint) |
| `tag-input` | `ChipToggle` (fixed options) + `TagInput` (free tags) for advocate forms |

---

## Conventions & gotchas

- **Backend quirks are normalized at the edge** (see `ai-brief.tsx`): `classification.location` may be a
  string *or* `{ state, district }`; `statute` falls back to `applicableLaws[0]`; `citations` may be `[]`;
  `aiResponse` may be `null` while processing. Responses mix `snake_case` and `camelCase` — types in
  `src/types/index.ts` follow the verified shapes.
- **IST booking:** advocate availability is IST wall-clock; the picker converts the chosen slot to the
  **UTC instant** before sending `scheduledAt`. `day_of_week` is `0 = Mon … 6 = Sun`.
- **BCI Rule 36:** consultations are **verified-advocate-only**; chat blocks contact/fee solicitation
  (sender sees "under review"); advocate bios forbid fees/outcomes (enforced + hinted in the UI).
- **Adding a primitive:** hand-write it in `components/ui/` using `cn()` + the design tokens (no Shadcn CLI).
- **Adding a string:** add the key to **both** `en` and `bn` in `src/i18n/config.ts` (missing `bn` keys fall
  back to `en`); `TranslationKey` is derived from the `en` set.
- **Sidebar collapse:** content hidden on icon-collapse is marked `data-sb-hide` (so avatars/icons survive).

---

## Last Updated
- 01-June-2026
- Hexabytes SurTech | `Parthib Panja`


