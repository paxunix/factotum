# PLAN.md — Factotum v1 Implementation Plan (Spec‑Aligned)

This plan is derived directly from `FACTOTUM_V1_HANDOFF.md` and the AGENTS “Don’t Drift” checklist. It is strictly constrained to v1 semantics and avoids non‑spec changes. UI should use Web Awesome web components as much as possible, bundled locally (no CDN runtime deps). All extension UI strings must use `chrome.i18n.getMessage` with `en-US` fallback; command metadata/help uses author‑provided localization.

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Authoritative spec; defer to it on any conflict.
- `AGENTS.md`: Guardrails and stop conditions for changes.
- `TEST.md`: Manual/harness tests tied to each milestone.
- `fixture-pack.md`: Fixture bundle for harness/milestone validation.
- `DEVELOPING.md`: RPC exposure specifics and troubleshooting when working in M3.

## 0) Scope guard (read first)
- Implement **only** v1 features described in `FACTOTUM_V1_HANDOFF.md`.
- If a change is not explicitly allowed by v1, **do not implement**; ask first.
- Preserve non‑negotiable semantics (omnibox resolution, execution model, worlds, requires, bridge, RPC, logging).

---

## Milestone Plan (user‑testable increments)

Each milestone should end with a runnable subset and the matching manual tests from `TEST.md`.

## Current status
- M1 is complete.
- Manual checks passed for T1, T2, T3, T3b, and T4b using the manager bundle import flow.
- M2 is active under the `chrome.userScripts` architecture.
- Current design learning: USER_SCRIPT is the viable command runtime; MAIN should be treated as a bridge target rather than a symmetric top-level runtime.
- Storage/import-export now quarantine stale invalid stored commands instead of letting one bad record poison manager listing or bundle export.
- Current UX direction: replace the transient overlay plus separate log page with a per-tab session console overlay that is lazy-created, dismissible, reopenable via `f -`, and discarded on tab close.
- Current session-console progress: reopened sessions now show per-tab append-only history entries for completed/help/error/canceled command outcomes.
- Current session-console progress: active command state now renders in the same bubble stream as saved history, and terminal overlays no longer auto-dismiss.
- Current runtime state: short commands, long-running commands, manual cancel, and cancel-on-navigation are all working again after moving USER_SCRIPT completion/cancel coordination to DOM-backed markers instead of unreliable USER_SCRIPT-to-service-worker completion messages.

### M1 — Storage + Omnibox Resolution (no execution)
**Status:** complete
**Delivered:** install/import commands, resolve tokens, and list commands in the manager UI.

**Delivered**
- Storage layer CRUD (`fcmd:index`, `fcmd:aliases`, `fcmd:cmd:<name>@<id>`) with import/export.
- Validation for name/id and `disabled` support in storage.
- Omnibox resolution with MRU + disabled filtering and no‑such‑command handling.
- Omnibox suggestion UX for exact-resolution previews and prefix-matched command-name suggestions.
- Manager bundle import/export and enable/disable controls to make M1 manually testable.
- Quarantine handling for invalid stored commands, with separate `invalidCommands[]` export/import preservation and manager visibility.

**Verified**
- T1, T2, T3, T3b, T4b
- T4 resolution path returns `NO_SUCH_COMMAND`; overlay verification remains an M2 concern because M1 has no execution/overlay path.
- Manual follow-up should cover quarantined invalid-command export/import behavior.

### M2 — Injection + Overlay + Cancellation (core execution)
**Ready:** execute commands with overlay and cancel behavior.

**Direction**
- Execute command code in USER_SCRIPT via `chrome.userScripts.execute()`.
- Treat MAIN access as explicit bridge work through `ctx.main`.

**Include**
- Injection pipeline (overlay + USER_SCRIPT runtime + MH), busy tab guard, non‑injectable error.
- Cancel on overlay/tab close/navigation commit.
- Basic USER_SCRIPT runtime lifecycle and status transitions.

**Manual tests**
- T5–T10, T7 (overlay), T8 (cancel).

### Next checkpoint — Session Console Redesign
**Ready:** replace the transient overlay/log split with a per-tab session console.

**Direction**
- Keep the omnibox as the only input surface.
- Preserve one active invocation per tab for now.
- Treat the console as per-tab session state that survives dismissal and navigation, but is discarded when the tab closes.

**Include**
- Replace transient overlay takeover behavior with a persistent per-tab scrollback surface.
- Support `f -` to reopen the current tab’s hidden session console.
- Add an explicit command-facing output API (`ctx.out.write/info/warn/error`) for scrollback entries.
- Keep `--help` as inline console content instead of a special takeover card.
- Add resize support for the scrollback region.
- Remove the separate log UI once the console is a sufficient replacement for command-facing output.

**Manual tests**
- Reopen hidden console with `f -`.
- Scrollback retains prior entries across multiple commands in one tab.
- Scrollback is per-tab and disappears on tab close.
- Active invocation state and system notices do not clobber prior entries.
- `ctx.out.*` entries appear in order and are visually attributed to the active command.

### M3 — Requires + Bridge + RPC
**Ready:** dependency loading, MAIN bridge, privileged API access.

**Include**
- Requires loader (MAIN script/module, USER_SCRIPT module best‑effort).
- MAIN bridge define/call with nonce enforcement.
- RPC core (`ctx.chrome`) with denylist, events/ports rejection.

**Manual tests**
- T11–T20.

### M4 — Help/OptionsSpec + Session Console Output
**Ready:** help rendering, auto‑generated usage, command-visible session output.

**Include**
- Help HTML templating + localized strings; optionsSpec → tokens.
- Session console output sink (cap/delete/clear) exposed through command-facing APIs.

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

**Status:** complete

**Files (expected)**
- `src/sw/storage.js` (index/alias/command CRUD + import/export)
- `src/sw/validation.js` (regex validation helpers)

**Notes**
- Import/export warnings for duplicate commands and alias collisions are implemented.
- Invalid stored commands are preserved in quarantined form and excluded from normal resolution/export paths.
- Locale resolution follows exact match, primary-language fallback, `en-US`, then first available key.

---

## 2) Omnibox Parsing + Resolution
**Spec sections:** 4, 20.4

**Status:** complete

**Files (expected)**
- `src/sw/omnibox.js` (tokenize, parse, resolve)
- `src/sw/dispatch.js` (start invocation, update MRU)

**Notes**
- Tokenization uses `shell-quote`.
- Option parsing uses `mri`.
- M1 stops at resolution and MRU updates; overlay/error display starts in M2.

---

## 3) Injection Pipeline + Busy Guard
**Spec sections:** 5, 20.1, 20.6

**Tasks**
- Enforce tab‑bound, top‑frame‑only execution; refuse non‑injectable pages.
- Guard against re‑entrancy (one invocation per tab).
- Start sequence: create `invocationId` + `nonce`, update MRU, inject overlay (ISOLATED), ensure MAIN host when needed, execute command via `chrome.userScripts.execute()` in USER_SCRIPT world.
- End sequence: teardown overlay, clear busy state, drop MH handlers, reject further RPC.

**Files (expected)**
- `src/sw/inject.js`
- `src/sw/invocations.js`
- `src/overlay/overlay.js`
- `src/bridge/main_host.js`

**Manual tests**
- Non‑injectable page hard error.
- Busy tab refusal.
- Overlay state transitions and teardown.

---

## 4) Overlay UI / Session Console (ISOLATED only)
**Spec sections:** 10, 20.6

**Tasks**
- Replace the transient status card with an ISOLATED shadow‑DOM session console for each tab.
- Show scrollback plus active invocation state (`RUNNING`, `DONE`, `ERROR`, `CANCELED`, `BUSY`, `HELP`) without letting later notices clobber prior entries.
- Support hiding vs destroying the console; `f -` should reopen the hidden console for the current tab.
- `--help` shows rendered help HTML inline in the console, skips requires + main, ends after display.
- Use Web Awesome components where appropriate (button, alert, spinner), bundled locally.
- Render help HTML from `helpHtmlTemplate` + localized `helpHtmlStrings` using locale resolution order; fallback `en-US`.
- Generate help tokens (`usage/options/args`) from `optionsSpec` when present.
- Allow resizing the scrollback region for desktop use.

**Files (expected)**
- `src/overlay/overlay.js`
- `src/overlay/overlay.css`

**Manual tests**
- Console appears in top frame only.
- `f -` reopens the hidden console for the current tab.
- `--help` path shows raw HTML inline and ends invocation.

---

## 5) Session Console Output Sink
**Spec sections:** 11

**Tasks**
- Single session‑only per-tab output sink for command-visible entries.
- Cap at 1000 entries; drop oldest on overflow.
- Safe JSON stringify with circular replacer; include stack traces for Error logs.
- Provide command-facing output APIs such as `ctx.out.write/info/warn/error`.
- Session console shows oldest→newest, clear all, and command attribution.
- Use Web Awesome components where appropriate (buttons, dialogs), bundled locally.
- Output entries accept `{ l10n: LocalizedText, data?: any }` for localized display in UI.
- Extension UI labels for the session console must use `chrome.i18n.getMessage`.

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
- `src/overlay/overlay.js`
- `src/overlay/overlay.css`

**Manual tests**
- Order preserved, clear entry history, clear all.
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
- Treat MAIN as a bridge target rather than a top-level command runtime.
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
- USER_SCRIPT module best‑effort: execute `await import(url)` in the user-script world with clear failure.
- Require failure aborts invocation with `REQUIRES_FAILED` + logs.

**Files (expected)**
- `src/runner/requires.js`
- `src/bridge/main_host.js` (IMPORT, SCRIPT_LOAD ops)

**Manual tests**
- Sequential order enforced.
- `data:` rejected.
- MAIN and USER_SCRIPT module behaviors.

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
- Ensure fixtures: pick@fixture.A/B (MRU), alias cmd1 → pick@fixture.B, longrun cancel, badreq requires fail, bridge, denylisted, events unsupported, and a dedicated localized help/options fixture.
- Maintain a separate smoke bundle for ad hoc manual checks such as `ok@demo.ok` and `longrun@demo.cancel`.

**Files (expected)**
- `fixtures/fixtures-v1.json`
- `fixtures/smoke-v1.json`
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
- Bundle Web Awesome assets locally (no CDN runtime deps); ensure CSS/theme is shipped with UI pages.
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
- Requires sequential ordering; `data:` rejection; MAIN import; USER_SCRIPT import best‑effort.
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
