# AGENTS.md — Factotum “Don’t Drift” Checklist (v1)

This repo implements the **Factotum v1** spec. When using Codex/agents, the #1 risk is spec drift.
This checklist is the contract for all automated changes.

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Source of truth for all behavior and schema; always read before implementing.
- `PLAN.md`: Use for sequencing work and mapping to spec sections/tests.
- `TEST.md`: Use to select manual smoke tests and harness checks for your change.
- `DEVELOPING.md`: Use when modifying RPC exposure or debugging RPC/bridge/requires behavior.
- `fixture-pack.md`: Use when installing or validating fixtures for tests.

## 0) Golden rule
**If a change is not explicitly allowed by the v1 spec, do not implement it.**
Ask before changing semantics.

## 1) Authoritative docs
The following are authoritative, in this order:
1) `FACTOTUM_V1_HANDOFF.md` (v1 spec + protocols + tests)
2) `manifest.json` (as constrained by the spec)
3) Any `docs/*.md` explicitly labeled “authoritative” (if added later)

If there is a conflict, treat `FACTOTUM_V1_HANDOFF.md` as the source of truth and flag the conflict.

## 2) Scope control
Agents MUST:
- Implement only v1 features described in the handoff doc
- Avoid adding “nice-to-haves” (search suggestions, auto-migrations, UI helpers, background continuation, event bridging, ports)
- Avoid changing the storage schema unless explicitly required

Agents MUST NOT:
- Add frameworks (React/Vue/etc.)
- Add hot reload / dev server requirements
- Add persistent run history (logs are session-only in v1)
- Add timeouts or watchdogs (v1 has no timeouts)
- Add re-entrancy or multi-command concurrency per tab

## 3) Non-negotiable v1 semantics
Must be preserved exactly:

### Omnibox resolution
- POSIX-like tokenization (`shell-quote`)
- Option parsing (`mri`)
- Alias (exact match) wins over command names
- `name@id` resolves exact
- bare `name` resolves MRU-first
- MRU updates on invocation start (not completion)
- No alternates/smart suggestions in v1 (“No such command” only)

### Execution model
- MV3, tab-bound
- Hard error on non-injectable pages (no RPC-only fallback)
- One invocation per tab (no re-entrancy)
- Cancel on tab close AND top-level navigation commit
- No timeouts
- Top frame only

### Worlds and UI
- Command world is explicit: MAIN or ISOLATED
- Overlay ALWAYS in ISOLATED (shadow DOM), top frame only
- Help HTML is raw (no sanitization)

### Requires
- Sequential only
- Side-effect only (no returned handles)
- `data:` disallowed
- Default require world MAIN
- `world:"isolated"` allowed only for `kind:"module"` (best-effort)
- MAIN module requires use dynamic `import(url)` within MAIN host

### Bridging
- Use named entrypoints: `ctx.main.define(name, fn)` and `ctx.main.call(name, args)`
- Bridge messages must include `invocationId` + per-invocation `nonce`

### Privileged APIs
- `ctx.chrome` is a Proxy to SW RPC
- Expose all callable one-shot functions representable as RPC, except:
  - denylisted namespaces: `chrome.debugger`, `chrome.management`
  - no events, no ports, no listeners
- Promise-based only; SW promisifies callbacks

### Logging
- Single sink for runtime + command logs
- Session-only in-memory store
- Max 1000 entries, drop oldest
- Remove individual entries; clear all; oldest→newest
- Safe JSON stringify with circular replacer; capture stack traces

## 4) Implementation constraints
- Plain JS (no TypeScript required)
- Multi-page UI allowed
- esbuild-based tiny build (no heavy toolchain)
- No CDN runtime dependencies for extension code (bundle deps)
- **MUST:** All extension UI strings must use `chrome.i18n.getMessage` with `en` fallback; do not hard-code user-visible text in HTML/JS/CSS.

## 5) Required deliverables for non-trivial PRs
For any non-trivial change, agent must:
- Explain which v1 spec sections it implements
- Add/adjust tests or a manual test note referencing the Test Plan cases
- Call out any MV3/CSP edge cases discovered
- At each commit point, provide a concise markdown commit message summary suitable for `git commit`
- Update relevant `.md` docs to remove completed work, record what was learned, and keep next steps aligned with the current repo state

## 6) Stop conditions (ask before proceeding)
Agent must STOP and ask before:
- Changing message formats / protocol constants
- Changing storage keys or schema fields
- Adding permissions beyond “broad permissive” defaults in v1 (except when required by Chrome)
- Adding new UI helpers beyond overlay
- Adding event/port bridging or background continuation

## 7) Definition of done
A change is “done” only if:
- It passes the v1 manual smoke suite relevant to the change
- It does not alter v1 semantics
- It updates docs if it changes behavior (behavior changes should be avoided in v1)
