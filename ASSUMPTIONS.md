# Digital Heroes — Assumptions & Interpretation Notes

**Purpose:** The PRD (v1.0, March 2026) is deliberately ambiguous in several places, particularly around the draw engine and prize pool mechanics. This note documents the interpretations made, the reasoning behind them, and the implementation implications — so evaluators can see the decision process, not just the resulting code.

---

## 1. The Draw-Number Mechanic

**Ambiguity:** §06 describes three match tiers (5-number, 4-number, 3-number match) but never specifies *how a subscriber's numbers are generated*, how many numbers make up a "ticket," or what the draw actually matches against.

**Interpretation adopted:**
- Each active subscriber is issued a **5-number ticket** (numbers drawn from a fixed range, e.g. 1–49) automatically at the start of each monthly draw cycle — not chosen manually by the user. This keeps the UX simple (no lottery-picker UI needed) and matches the PRD's framing of the draw as something that happens *to* subscribers as a reward for staying subscribed, not a game they actively play.
- A ticket is **re-issued every cycle**, not persistent, so churn/rejoin doesn't create stale entries.
- Two ticket-generation modes, matching the PRD's two draw types:
  - **Random mode:** numbers generated via a cryptographically sound RNG (Node's `crypto.randomInt`), uniformly distributed.
  - **Algorithmic mode:** number generation is *weighted* by the subscriber's recent Stableford score average (last 5 entries). Higher/more consistent scores bias the RNG toward numbers historically drawn less often (a soft "loyalty/skill" tilt), rather than literally converting golf scores into lottery numbers — the PRD gives no formula, so this was chosen to keep the "algorithmic" mode meaningfully different from pure random while staying transparent and auditable.
- The **winning ticket** for a cycle is generated the same way as user tickets (draw-mode dependent) and compared against all subscriber tickets for tier matches (5/4/3 numbers correct, order-independent).

**Implication:** The draw logic is implemented as a pure function (`generateTicket(config)`, `runDraw(tickets, winningTicket)`) fully decoupled from HTTP/DB, so it can be unit-tested deterministically by seeding the RNG, and so "simulate" and "publish" call identical logic with different persistence behavior.

---

## 2. Prize Pool Timing

**Ambiguity:** §07 defines pool share percentages (40/35/25%) of "the prize pool" but doesn't say *when* the pool amount is calculated — continuously as subscriptions come in, or as a snapshot at draw time — nor what happens to a subscriber who joins or cancels mid-cycle.

**Interpretation adopted:**
- The prize pool is **not** a running real-time balance. It is **calculated once, at draw-simulation/publish time**, as: `(number of active subscribers at that moment) × (fixed prize-pool contribution per subscription, e.g. a % of the monthly-equivalent fee)`.
- This snapshot amount is then split 40/35/25 across the three tiers.
- A subscriber must have an **active, paid subscription at the moment the draw is run** to be eligible and counted toward the pool — subscriptions that lapse before the draw runs are excluded from both the pool calculation and ticket issuance for that cycle.
- Yearly subscribers contribute the **monthly-equivalent** portion of their fee to each cycle's pool, rather than their full annual fee landing in a single month — this avoids one yearly signup distorting a single month's pool.

**Reasoning:** A real-time/continuously-updating pool creates race conditions and non-reproducible draw results (the same draw could "simulate" differently a few minutes apart), which conflicts with the requirement that admins can simulate *before* publishing. A snapshot model makes simulation deterministic and auditable.

**Implication:** `draws` table stores the snapshot pool amount and subscriber count at simulation time, not just at publish time — so admins can compare simulated vs. actual figures if the population shifted before publish.

---

## 3. Jackpot Rollover Logic

**Ambiguity:** §07 states the 5-number match "rolls over" if unclaimed, but doesn't define what "unclaimed" means (no winning ticket exists that cycle? vs. a winner exists but never submits verification?) or how rollover compounds across multiple consecutive misses.

**Interpretation adopted:**
- "Unclaimed" = **no subscriber ticket matched all 5 numbers** in that cycle's draw (i.e., no winner was even identified — this is a draw-outcome condition, not a claims-process condition).
- If a winner *is* identified but fails winner verification (§09) — proof rejected, or never submitted within a defined window (e.g. 14 days) — that amount is **forfeited to next cycle's pool as a separate "forfeited winnings" addition**, distinct from a true rollover. This distinction matters for reporting: a rollover reflects draw randomness, a forfeiture reflects a verification failure, and admins likely want to see these separately in analytics.
- Rollover amounts **compound additively**: each unclaimed cycle's 5-match pool share is added to the *next* cycle's 5-match pool share before that cycle's split is calculated, and continues compounding until a valid winner is verified and paid.

**Implication:** `draws` table carries a `jackpot_rollover_in` and `jackpot_rollover_out` field per cycle, so the compounding chain is fully traceable across cycles rather than stored as a single mutable running balance (which would make historical draws non-reconstructable).

---

## 4. Summary of Design Principles Behind These Calls

1. **Determinism over cleverness** — every ambiguous mechanic was resolved in favor of the option that makes simulation reproducible and auditable, since the PRD explicitly requires a simulate-before-publish step.
2. **Snapshot over real-time** — pool and eligibility figures are locked at draw-run time to avoid race conditions and to make historical draws explainable after the fact.
3. **Separation of randomness outcomes from process failures** — a true rollover (no winner) and a forfeiture (winner failed verification) are tracked separately, since conflating them would make admin reporting misleading.
4. **Server-authoritative state** — none of the above logic is trusted from the client; ticket generation, pool calculation, and rollover tracking all happen server-side against the database as the source of truth.

These interpretations are implemented as isolated, unit-tested modules (`drawEngine.ts`, `poolCalculator.ts`) precisely so that if a reviewer disagrees with an assumption, the fix is localized rather than requiring a rewrite of the surrounding system.

## 5. Admin Score Management

**Ambiguity:** PRD §11 states admins can "Edit golf scores." It does not explicitly state whether admins can *add* new scores or only edit/delete existing ones.

**Interpretation adopted:**
- Interpreted as: admins have full CRUD (add, edit, delete) capabilities for a user's scores. When correcting a user's account, an admin might plausibly need to add a missed score just as much as edit an incorrect one.

---

## 6. Charity Contribution Percentage

**Ambiguity:** PRD §08 states "Users may voluntarily *increase* their charity percentage," which reads as one-directional.

**Interpretation adopted:**
- Interpreted as: users can set their contribution to any value ≥ 10% (not strictly increase-only). A strict one-way ratchet has no clear undo path if a user makes a mistake or changes their mind, which is poor UX.

---

## 7. Future Updates (Out of Scope for This Submission)

**Queue-based draw scheduling (BullMQ + Redis).** The PRD does not specify how the monthly draw is triggered — only that it has a "monthly cadence" and that "admin controls publishing." For this submission, draw execution is triggered by an admin action (a manual "Run Draw" click, optionally backed by a simple `node-cron` schedule calling the same underlying function) rather than a dedicated job queue.

A production-grade version of this platform, where real money is at stake and draws must run reliably without human intervention, would benefit from moving to a proper queue (BullMQ + Redis) for the draw trigger — giving retry logic, job visibility, and guaranteed execution independent of any single server instance. This was deferred for the current scope because:

- Adding Redis + a queue is real infra overhead (another service to deploy/manage) for a trainee project that's already juggling Stripe, Postgres, auth, and an admin panel.
- The pure-function design of `runDraw()` means adopting a queue later is a scheduling/infrastructure change only — no changes to the draw logic itself would be required.
