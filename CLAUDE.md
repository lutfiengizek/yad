# CLAUDE.md

Behavioral guidelines (Karpathy) + YAD project context. Read both halves.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## PART A — Behavioral guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## PART B — YAD project context

### What YAD is
A **desktop digital archive** (DAM) for journalists/editors. Local-first, decentralized, portable. Core philosophy: **nothing is ever lost**, **data lives next to the files**, **decentralized but private** (no cloud server, no blockchain).

### Tech stack
Tauri v2 · React + TypeScript + shadcn/ui · Rust (Tauri commands) · SQLite + FTS5 · **Iroh** (iroh + iroh-blobs + iroh-docs) for P2P/content-addressed transport · **Automerge** for CRDT metadata · ProseMirror for notes · tauri-plugin-updater for auto-update.

### Architecture decisions that must NOT drift (see `yad-prd-v4.md`)
- **Frontend never touches the filesystem/DB.** Everything goes through Tauri commands (`invoke`). Backend is the single authority.
- **Two layers:** files = content-addressed (BLAKE3) + versioned; metadata (tags/notes/persons/rating) = CRDT (Automerge). SQLite/FTS5 is a *derived* search view, not the source of truth.
- **Storage model: physical storage + virtual navigation.** Real, readable files live under the YAD library; organization (tags, collections) is virtual; a file appears in many places but exists once on disk. NO rigid "app tree = disk tree", NO physical copies for multi-placement.
- **Collaboration:** pure-Iroh **invite link** (no central server, no Supabase), roles **Owner / Editor / Viewer**, access = sync tier (Viewer never receives originals). Every metadata mutation carries **author/attribution** from day one.
- **iroh-blobs:** use stable **0.35** series to start (current 0.10x is "not production quality"); do NOT write a custom QUIC transfer. Relay is **self-hosted** in production.
- **Explicitly excluded from v1:** Supabase, WebRTC/STUN, at-rest encryption, Google Drive, `.yad` export/import, plugins/MCP, mid-tier roles (Contributor/Manager), folder auto-watch. Don't build later-phase features.

### Authoritative documents (don't duplicate — point to these)
- `yad-prd-v4.md` — product requirements & architecture decisions
- `docs/yad-wireframes-v1.md` — every screen + UX
- `docs/build/00-build-overview.md` — two-agent build model, milestones, testing, plan-first workflow
- `docs/build/01-api-contract.md` — **the shared Frontend↔Backend contract (single source of truth)**
- `docs/build/02-frontend-agent.md` / `03-backend-agent.md` — per-agent briefs
- `.claude/rules/architecture-rules.md` — project structure, FE/BE boundary, naming (BINDING)
- `.claude/rules/ui-rules.md` — shadcn workflow, color/font/layout rules (BINDING, frontend)

### Hard rules (summary — full detail in the rules files)
- **Naming:** Rust `snake_case`, TS `camelCase`, types/components `PascalCase`, Tauri commands `snake_case`, DB columns `snake_case`. Boundary structs use serde `rename_all = "camelCase"`.
- **UI:** shadcn MCP workflow is mandatory (search → view → examples → add → audit); never hand-write a component that exists in the registry. Colors only via `globals.css` tokens (no hardcoded hex/rgb/hsl/oklch). Fonts only the solar-dusk three: `font-sans` Oxanium, `font-serif` Merriweather (long-form), `font-mono` Fira Code. No `!important`, no inline styles, no non-shadcn UI libs (except ProseMirror/tiptap). Test every change in light AND dark.
- **i18n:** all user-facing strings live in `src/i18n/`, key-based, Turkish first.
- **API access (frontend):** never call `invoke` directly; go through `src/lib/api/` (typed client + mock). Components are mock/real agnostic.

### Build workflow
Two parallel agents (Frontend on `src/`, Backend on `src-tauri/`) coordinated only through `docs/build/01-api-contract.md`. Each agent: **read docs → write a short plan (`docs/build/plans/…`) → execute directly (no approval gate), step by step, testing each step (DoD: tests pass, lint/format clean, FE both themes, small commit) → integrate at milestone boundaries.** Stop and ask only on a genuine ambiguity/contradiction. Contract is frozen per milestone; changes require updating the contract doc + syncing both agents.

### Communication
Respond to the user in **Turkish** (project docs are Turkish; this file is English to match its origin). Keep Turkish orthography correct (full diacritics).
