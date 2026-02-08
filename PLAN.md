# PLAN.md — Factotum v1 Implementation Plan (Spec‑Aligned)

This plan is derived directly from `FACTOTUM_V1_HANDOFF.md` and the AGENTS “Don’t Drift” checklist. It is strictly constrained to v1 semantics and avoids non‑spec changes. UI should use Shoelace web components as much as possible, bundled locally (no CDN runtime deps). All extension UI strings must use `chrome.i18n.getMessage` with `en-US` fallback; command metadata/help uses author‑provided localization.

## 0) Scope guard (read first)
- Implement **only** v1 features described in `FACTOTUM_V1_HANDOFF.md`.
- If a change is not explicitly allowed by v1, **do not implement**; ask first.
- Preserve non‑negotiable semantics (omnibox resolution, execution model, worlds, requires, bridge, RPC, logging).

---

## Milestone Plan (user‑testable increments)

Each milestone should end with a runnable subset and the matching manual tests from `TEST.md`.

### M1 — Storage + Omnibox Resolution (no execution)
**Ready:** install/import commands, resolve tokens, list in UI skeleton.

**Include**
- Storage layer CRUD (index/aliases/command keys), import/export.
- Validation for name/id; `disabled` support in storage.
- Omnibox resolution with MRU + disabled filtering; no‑such‑command handling.

**Manual tests**
- T1–T4, T3b (disabled), T4b (localized description in UI list).

### M2 — Injection + Overlay + Cancellation (core execution)
**Ready:** execute commands with overlay and cancel behavior.

**Include**
- Injection pipeline (overlay + runner + MH), busy tab guard, non‑injectable error.
- Cancel on overlay/tab close/navigation commit.
- Basic runner lifecycle and status transitions.

**Manual tests**
- T5–T10, T7 (overlay), T8 (cancel).

### M3 — Requires + Bridge + RPC
**Ready:** dependency loading, MAIN bridge, privileged API access.

**Include**
- Requires loader (MAIN script/module, ISOLATED module best‑effort).
- MAIN bridge define/call with nonce enforcement.
- RPC core (`ctx.chrome`) with denylist, events/ports rejection.

**Manual tests**
- T11–T20.

### M4 — Help/OptionsSpec + Logging UI
**Ready:** help rendering, auto‑generated usage, session log viewer.

**Include**
- Help HTML templating + localized strings; optionsSpec → tokens.
- Log sink (cap/delete/clear) + log UI.

**Manual tests**
- T7b–T7c, T21–T24.

### M5 — Manager/Editor UI + Import UX
**Ready:** full authoring UX + selective import.

**Include**
- Manager/editor page with structured editing (code/help/optionsSpec), aliases, enable/disable.
- Import bundle with per‑command selection + warnings; export all.
- New command defaults flow.

**Manual tests**
- T4b, T21c, plus import/export checks from `TEST.md` and `fixture-pack.md`.

### M6 — Dev Harness + Fixtures
**Ready:** dev automation hooks + fixture pack import.

**Include**
- Dev‑mode harness API + harness page.
- Fixture pack (`fixtures-v1.json`) import and validation.

**Manual tests**
- A1–A5 from `TEST.md`.

---

## 1) Storage Layer (chrome.storage.local)
**Spec sections:** 3, 12, 20.4

**Tasks**
- Create helpers for `fcmd:index`, `fcmd:aliases`, `fcmd:cmd:<name>@<id>` (schemaVersion 1).
- Enforce regex validation for `name` and `id` on insert/update.
- Implement MRU fields (`mruAt`) and update on invocation start only.
- Add import/export support for bundleSchemaVersion 1 with warnings for duplicates/alias collisions.
- Support `description` as `LocalizedText` (strings treated as `en-US`).
- Support `helpHtmlTemplate` + `helpHtmlStrings` for templated help HTML.
- Implement locale resolution utility (exact, primary, `en-US`, first available) for command‑authored strings.
- Support `disabled` flag for commands; exclude disabled from resolution.
- Support `optionsSpec` for help token generation.

**Files (expected)**
- `src/sw/storage.js` (index/alias/command CRUD + import/export)
- `src/sw/validation.js` (regex validation helpers)

**Manual tests**
- Import/export bundle schema version behavior.
- Duplicate `(name,id)` warning is surfaced.
- MRU update on invocation start (not completion).

---

## 2) Omnibox Parsing + Resolution
**Spec sections:** 4, 20.4

**Tasks**
- Tokenize input using POSIX sh (`shell-quote`).
- Parse options via `mri` default semantics (short/long, combined shorts, `--` end‑of‑options, `--flag=value`).
- Resolve: alias exact match → `name@id` exact → bare `name` MRU‑first.
- Skip disabled commands during resolution.
- On no match: omnibox suggestion “No such command: …”, overlay error on execute.

**Files (expected)**
- `src/sw/omnibox.js` (tokenize, parse, resolve)
- `src/sw/dispatch.js` (start invocation, update MRU)

**Manual tests**
- Alias precedence, fully‑qualified token, MRU‑first, no‑such‑command behavior.

---

## 3) Injection Pipeline + Busy Guard
**Spec sections:** 5, 20.1, 20.6

**Tasks**
- Enforce tab‑bound, top‑frame‑only execution; refuse non‑injectable pages.
- Guard against re‑entrancy (one invocation per tab).
- Start sequence: create `invocationId` + `nonce`, update MRU, inject overlay (ISOLATED), ensure MAIN host, inject runner in command world.
- End sequence: teardown overlay, clear busy state, drop MH handlers, reject further RPC.

**Files (expected)**
- `src/sw/inject.js`
- `src/sw/invocations.js`
- `src/overlay/overlay.js`
- `src/runner/runner_main.js`
- `src/runner/runner_isolated.js`
- `src/bridge/main_host.js`

**Manual tests**
- Non‑injectable page hard error.
- Busy tab refusal.
- Overlay state transitions and teardown.

---

## 4) Overlay UI (ISOLATED only)
**Spec sections:** 10, 20.6

**Tasks**
- Build ISOLATED shadow‑DOM overlay showing `name@id`, status, cancel.
- Implement status states: RUNNING, DONE, ERROR, CANCELED, BUSY, HELP.
- `--help` shows rendered help HTML (template + localized strings), skips requires + main, ends after display.
- Use Shoelace components where appropriate (button, alert, spinner), bundled locally.
- Render help HTML from `helpHtmlTemplate` + localized `helpHtmlStrings` using locale resolution order; fallback `en-US`.
- Generate help tokens (`usage/options/args`) from `optionsSpec` when present.

**Files (expected)**
- `src/overlay/overlay.js`
- `src/overlay/overlay.css`

**Manual tests**
- Overlay appears in top frame only.
- `--help` path shows raw HTML and ends invocation.

---

## 5) Session Log Sink + Log UI
**Spec sections:** 11

**Tasks**
- Single session‑only log sink shared by runtime + commands.
- Cap at 1000 entries; drop oldest on overflow.
- Safe JSON stringify with circular replacer; include stack traces for Error logs.
- Log UI page: oldest→newest, remove entry, clear all.
- Use Shoelace components where appropriate (table, buttons, dialogs), bundled locally.
- Log entries accept `{ l10n: LocalizedText, data?: any }` for localized display in UI.
- Extension UI labels for the log must use `chrome.i18n.getMessage`.

## 5.1 Manager/Editor UI (dashboard)
**Spec sections:** 3, 10, 11, 12

**Tasks**
- Provide a manager page listing installed commands (name/id/world/updated, disabled state).
- Support enable/disable toggle (updates `disabled` flag).
- Provide structured editing for command fields (no raw JSON editor).
- Separate editors for code and help template/strings.
- Provide editing for `optionsSpec` (flags, descriptions, defaults) used for help generation.
- Manage aliases (add/remove alias keys for a command).
- Import bundle with per-command selection + warnings for duplicates/alias collisions.
- Export all to bundleSchemaVersion 1.
- Provide “new command” flow with sensible defaults.

**Files (expected)**
- `src/sw/logs.js`
- `src/ui/log.js`
- `src/ui/log.html`

**Manual tests**
- Order preserved, delete entry, clear all.
- Cap behavior drops oldest past 1000.

---

## 6) RPC Core (`ctx.chrome`)
**Spec sections:** 9, 20.7

**Tasks**
- Proxy mapping `ctx.chrome.ns.method(...)` → SW RPC `ns.method`.
- Promisify callback APIs with `chrome.runtime.lastError`.
- Denylist namespaces: debugger, management.
- Block events + ports (listeners/connect), reject unsupported shapes.
- Enforce invocationId validity + tab binding + canceled/ended rejection.

**Files (expected)**
- `src/sw/rpc.js`
- `src/runner/ctx_chrome.js`

**Manual tests**
- Basic RPC calls succeed.
- Denylisted namespace rejection.
- Events/ports rejected.
- Uncloneable result handled.

---

## 7) MAIN Bridge Host + Protocol
**Spec sections:** 8, 20.2

**Tasks**
- Implement `ctx.main.define(name, fn)` and `ctx.main.call(name, args)`.
- Use `window.postMessage` with `invocationId`, `nonce`, and `callId`.
- Maintain per‑invocation handler map; reply `{ok,result}` / `{ok:false,error}`.
- Surface `BRIDGE_FAILED` on failure; log error.

**Files (expected)**
- `src/bridge/main_host.js`
- `src/runner/ctx_main.js`

**Manual tests**
- Define/call works in MAIN; spoofed nonce rejected.

---

## 8) Requires Loader
**Spec sections:** 7, 20.5

**Tasks**
- Sequential, side‑effect only; `data:` URLs disallowed.
- Default world MAIN regardless of command world.
- MAIN script: `<script src>` + load/error.
- MAIN module: `await import(url)` via MAIN host.
- ISOLATED module best‑effort: `await import(url)` in CR with clear failure.
- Require failure aborts invocation with `REQUIRES_FAILED` + logs.

**Files (expected)**
- `src/runner/requires.js`
- `src/bridge/main_host.js` (IMPORT, SCRIPT_LOAD ops)

**Manual tests**
- Sequential order enforced.
- `data:` rejected.
- MAIN and ISOLATED module behaviors.

---

## 9) Cancellation
**Spec sections:** 6

**Tasks**
- Cancel triggers: overlay, tab close, top‑level navigation commit.
- Cooperative abort: set `ctx.signal.aborted`, reject future RPC with `CANCELED`.
- Ensure teardown and busy state cleared on cancel.

**Files (expected)**
- `src/sw/cancel.js`
- `src/runner/ctx_signal.js`

**Manual tests**
- Cancel button works.
- Cancel on tab close + navigation commit.

---

## 10) Dev Harness API (dev‑only)
**Spec sections:** 17

**Tasks**
- Implement SW dev messages: START, GET_LOGS, CLEAR_LOGS, GET_STATE, CANCEL.
- START bypasses omnibox; uses input string.
- Enforce dev‑mode gating.

**Files (expected)**
- `src/sw/harness.js`
- `src/ui/harness.html`

**Harness tests (A1–A5)**
- START, GET_LOGS, CLEAR_LOGS, GET_STATE, CANCEL behaviors.

---

## 11) Fixtures + Harness Tests
**Spec sections:** 18

**Tasks**
- Import canonical `fixtures-v1.json` bundle.
- Ensure fixtures: pick@fixture.A/B (MRU), alias cmd1 → pick@fixture.B, longrun cancel, badreq requires fail, bridge, denylisted, events unsupported.

**Files (expected)**
- `fixtures/fixtures-v1.json`
- `src/ui/harness.html`

**Harness tests**
- MRU ordering via fixtures.
- Cancel tests via longrun fixture.
- Requires failure path.
- Bridge and denylist tests.

---

## 12) Permissions + Manifest
**Spec sections:** 13

**Tasks**
- Ensure `<all_urls>` host permissions.
- Broad extension permissions for `chrome.*` usage.
- Keep denylisted namespaces blocked (debugger/management).

**Files (expected)**
- `manifest.json`

**Manual tests**
- Inspect manifest matches spec and does not add extra permissions beyond v1.

---

## 13) Build/Packaging
**Spec sections:** 14

**Tasks**
- esbuild bundles JS to `dist/`.
- Copy static HTML/CSS/assets without bundling.
- No framework, no hot reload, no CDN runtime deps.
- Bundle Shoelace assets locally (no CDN runtime deps); ensure CSS/theme is shipped with UI pages.
- UI strings sourced from `_locales` via `chrome.i18n.getMessage` with `en-US` fallback; use `Intl` for dates/localizable data.
- Ensure `manifest.json` sets `default_locale` when `_locales/` is present; allow `__MSG_key__` use where appropriate.

**Files (expected)**
- `scripts/build.js` or `esbuild.config.js`
- `dist/` outputs

---

## 14) Drift Prevention Checks (hard requirements)
**Spec sections:** 20

**Tasks**
- All cross‑context messages include `invocationId`.
- Bridge messages include `invocationId` + `nonce`.
- Fatal wrapper failures log at least one error entry.
- Overlay always ISOLATED top frame.
- No events/ports; denylist debugger/management.
- MRU updates on invocation start only.

---

# Test Plan (Manual + Harness)

## Manual Smoke Suite (required)
- Alias wins; `name@id`; bare name MRU‑first; no‑such‑command behavior.
- Non‑injectable page hard error.
- Overlay appears and status transitions.
- Cancel button; cancel‑on‑navigation; cancel‑on‑tab‑close.
- Requires sequential ordering; `data:` rejection; MAIN import; ISOLATED import best‑effort.
- Bridge define/call and nonce spoof prevention.
- RPC: basic calls, denylist block, event block, clone failures.
- Logging: order, delete entry, clear all, cap 1000 drops oldest.
- Localization: description and help template render in preferred UI language; log `l10n` entries display localized text; dates shown in UI locale with `en-US` fallback; extension UI labels are from `chrome.i18n`.

## Harness Automation (A1–A5)
- A1: START invocation path.
- A2: GET_LOGS returns session sink.
- A3: CLEAR_LOGS clears sink.
- A4: GET_STATE returns minimal invocation map.
- A5: CANCEL terminates invocation.

---

# Next Steps (operator checklist)
1) Confirm any missing files/structure in repo before implementation.
2) Implement tasks in order of the spec milestone plan (section 19).
3) Run manual smoke suite items relevant to each change.
4) Execute harness A1–A5 after dev‑hooks are implemented.
