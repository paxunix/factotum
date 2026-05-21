# PLAN.md — Factotum v1 Implementation Plan (Spec‑Aligned)

This plan is derived directly from `FACTOTUM_V1_HANDOFF.md` and the AGENTS “Don’t Drift” checklist. It is strictly constrained to v1 semantics and avoids non‑spec changes. UI should use Web Awesome web components as much as possible, bundled locally (no CDN runtime deps). All extension UI strings must use `chrome.i18n.getMessage` with `en-US` fallback; command metadata/help uses author‑provided localization.

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Authoritative spec; defer to it on any conflict.
- `AGENTS.md`: Guardrails and stop conditions for changes.
- `TEST.md`: Manual/harness tests tied to each milestone.
- `fixture-pack.md`: Fixture bundle for harness/milestone validation.
- `DEVELOPING.md`: RPC exposure specifics and troubleshooting when working in M3.
- `USER_GUIDE.md`: Update when a milestone changes end-user workflows or visible behavior.
- `FCMD_AUTHORING.md`: Update when a milestone changes fcommand schema, runtime, APIs, or author expectations.

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
- M2 core execution/session-console work is now landed under the `chrome.userScripts` architecture.
- Current design learning: USER_SCRIPT is the viable command runtime; MAIN should be treated as a bridge target rather than a symmetric top-level runtime.
- Storage/import-export now quarantine stale invalid stored commands instead of letting one bad record poison manager listing or bundle export.
- Current UX state: the per-tab session console is now the primary overlay surface. It is lazy-created, dismissible, reopenable via `f -`, preserved across navigation in the same tab, and discarded on tab close.
- Current session-console progress: reopened sessions show per-tab append-only history entries for completed/help/error/canceled command outcomes.
- Current session-console progress: active command state renders in the same bubble stream as saved history, and terminal overlays no longer auto-dismiss.
- Current session-console progress: busy and no-such-command notices append as system entries instead of taking over the current command view.
- Current session-console progress: `ctx.out.write/info/warn/error` append command-visible output bubbles, including localized payloads, into the per-tab session stream.
- Current session-console progress: the console now defaults to a wider desktop presentation and the scrollback region is vertically resizable.
- Current busy-guard direction: keep one invocation per tab, but explain refusals with a busy bubble that names the running command and tells the user to cancel or wait.
- Current runtime state: short commands, long-running commands, manual cancel, and cancel-on-navigation are all working again after moving USER_SCRIPT completion/cancel coordination to DOM-backed markers instead of unreliable USER_SCRIPT-to-service-worker completion messages.
- Current RPC state: `ctx.chrome` now works for the v1 one-shot surface, including callback-style methods like `tabs.query`/`bookmarks.search`, namespace denylist rejection, and event/listener-shape rejection.
- Current bridge state: `ctx.main.define/call` works with nonce-scoped responses, and spoofed nonce messages are ignored.
- Current requires state: sequential MAIN script loads, MAIN module imports, `data:` rejection, and best-effort USER_SCRIPT module failure paths are implemented and manually verified.
- Current manager state: the page uses top-level Manager and Utilities tabs. The Manager tab is a two-pane command navigation plus editor view; the Utilities tab contains bundle import/export with a full-height, internally scrolling bundle JSON field. The command panel has a filterable and sortable vertical command-name tab menu plus one selected-command detail card, including alias and version display. Bundle import/export, enable/disable, disable-before-delete hard delete, quarantine visibility, per-command import diagnostics, editable version and alias fields in the Identity section, and editing existing valid command body fields are implemented.
- Current near-term follow-ups: visual distinction between output/result/system bubbles, full manager/editor UX, dev harness automation, and a cleaner future `--debug` wrapper boundary.

### M1 — Storage + Omnibox Resolution (no execution)
**Status:** complete
**Delivered:** install/import commands, resolve tokens, and list commands in the manager UI.

**Delivered**
- Storage layer CRUD (`fcmd:index`, `fcmd:aliases`, `fcmd:cmd:<name>@<id>`) with import/export.
- Validation for name/id and `disabled` support in storage.
- Omnibox resolution with ranked case-insensitive name/alias prefix candidates, disabled filtering, and no‑such‑command handling.
- Omnibox suggestion UX where the first suggestion is the default executable target and other suggestions disambiguate alternate matches.
- Manager bundle import/export and enable/disable controls to make M1 manually testable.
- Quarantine handling for invalid stored commands, with separate `invalidCommands[]` export/import preservation and manager visibility.
- Existing valid command editor for description JSON, code, help template/strings, optionsSpec, and requires, plus command-card enablement switching through both a switch and a status pill, presented in the Manager tab's two-pane layout with filterable command-name navigation.

**Verified**
- T1, T2, T3, T3b, T4b
- T4 resolution path returns `NO_SUCH_COMMAND`; overlay verification remains an M2 concern because M1 has no execution/overlay path.
- Manual follow-up should cover quarantined invalid-command export/import behavior.

### M2 — Injection + Overlay + Cancellation (core execution)
**Status:** core delivered; follow-up polish remains in `TODO.md`.

**Direction**
- Execute command code in USER_SCRIPT via `chrome.userScripts.execute()`.
- Treat MAIN access as explicit bridge work through `ctx.main`.

**Include**
- Injection pipeline (overlay + USER_SCRIPT runtime + MH), busy tab guard, non‑injectable error.
- Cancel on overlay/tab close/navigation commit.
- Basic USER_SCRIPT runtime lifecycle and status transitions.

**Manual tests**
- T5–T10, T7 (overlay), T8 (cancel).

### Next checkpoint — Manager/editor UX, harness, and console polish
**Ready:** continue into manager/editor import UX, dev harness automation, and remaining session-console polish.

**Direction**
- Keep the omnibox as the only input surface.
- Preserve one active invocation per tab.
- Keep the session console as the command-facing per-tab surface; retain internal diagnostics separately until the log-page retirement decision is implemented.

**Include**
- Manager layout iteration: filterable command navigation and the top-level Manager/Utilities tab split are implemented.
- Manager editor iteration: stronger command-card hierarchy, structured editors for localized text/help/options/requires, and overlay-backed help preview.
- Session-console bubble styling distinctions for output vs command-state/system entries.
- Dev harness hooks/page for repeatable A1-A5 automation.
- Wrapper cleanup so a future `--debug` mode has a stable boundary before `main(argv, ctx)`.

**Manual tests**
- T4b/T4c/T4d/T4e/T21c plus manager import/export checks.
- Harness A1-A5 after dev hooks land.
- Existing session-console smoke checks from T0, T4, T7, T7b/T7c, T8, T9, and T21–T24 remain regression coverage for the current UI model.

### M3 — Requires + Bridge + RPC
**Status:** complete

**Delivered**
- Requires loader (MAIN script/module, USER_SCRIPT module best‑effort).
- MAIN bridge define/call with nonce enforcement.
- RPC core (`ctx.chrome`) with denylist, events/ports rejection.

**Verified**
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
- Import/export warnings for duplicate commands and alias collisions are implemented. Alias storage is global and may point one alias key at multiple commands.
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
- Maintain the ISOLATED shadow‑DOM session console for each tab.
- Keep scrollback plus active invocation state (`RUNNING`, `DONE`, `ERROR`, `CANCELED`, `BUSY`, `HELP`) in one append-only bubble stream.
- Support hiding vs destroying the console; `f -` reopens the hidden console for the current tab.
- `--help` shows rendered help HTML inline in the console, skips requires + main, and requires explicit user dismissal.
- Use Web Awesome components where appropriate (button, alert, spinner), bundled locally.
- Render help HTML from `helpHtmlTemplate` + localized `helpHtmlStrings` using locale resolution order; fallback `en-US`.
- Generate help tokens (`usage/options/args`) from `optionsSpec` when present.
- Keep the vertically resizable desktop scrollback region and wider default width.

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
- Keep `ctx.log/warn/error` separate as diagnostics rather than aliasing them to `ctx.out.*`.

## 5.1 Manager/Editor UI (dashboard)
**Spec sections:** 3, 10, 11, 12

**Tasks**
- Provide a manager page listing installed commands (name/id/world/updated, disabled state). Current state: implemented.
- Support enable/disable toggle (updates `disabled` flag). Current state: implemented.
- Provide structured editing for existing valid command fields. Current state: body fields are editable; name/id/world are read-only.
- Separate editors for code and help template/strings. Current state: code and help HTML template use CodeMirror; help strings remain a textarea field.
- Provide editing for `optionsSpec` (flags, descriptions, defaults) used for help generation. Current state: implemented as JSON textarea.
- Manage aliases (add/remove alias keys for a command). Current state: implemented through the Identity editor section over the global alias map.
- Import bundle with warnings for duplicates/alias collisions. Current state: implemented without per-command selection.
- Export all to bundleSchemaVersion 1. Current state: implemented.
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

**Status:** complete

**Delivered**
- Proxy mapping `ctx.chrome.ns.method(...)` → SW RPC `ns.method`.
- Promisify callback APIs with `chrome.runtime.lastError`.
- Denylist namespaces: debugger, management.
- Block events + ports (listeners/connect), reject unsupported shapes.
- Enforce invocationId validity + tab binding + canceled/ended rejection.

**Files**
- `src/sw/inject.js`
- `src/sw/sw.js`

**Verified**
- Basic RPC calls succeed.
- Denylisted namespace rejection.
- Events/ports rejected.
- Uncloneable result handled.

---

## 7) MAIN Bridge Host + Protocol
**Spec sections:** 8, 20.2

**Status:** complete

**Delivered**
- Treat MAIN as a bridge target rather than a top-level command runtime.
- Implement `ctx.main.define(name, fn)` and `ctx.main.call(name, args)`.
- Use `window.postMessage` with `invocationId`, `nonce`, and `callId`.
- Maintain per‑invocation handler map; reply `{ok,result}` / `{ok:false,error}`.
- Surface `BRIDGE_FAILED` on failure; log error.

**Files**
- `src/bridge/main_host.js`
- `src/sw/inject.js`

**Verified**
- Define/call works in MAIN; spoofed nonce rejected.

---

## 8) Requires Loader
**Spec sections:** 7, 20.5

**Status:** complete

**Delivered**
- Sequential, side‑effect only; `data:` URLs disallowed.
- Default world MAIN regardless of command world.
- MAIN script: `<script src>` + load/error.
- MAIN module: `await import(url)` via MAIN host.
- USER_SCRIPT module best‑effort: execute `await import(url)` in the user-script world with clear failure.
- Require failure aborts invocation with `REQUIRES_FAILED` + logs.

**Files**
- `src/sw/inject.js`
- `src/bridge/main_host.js`
- `src/fixtures/*.mjs`

**Verified**
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
- Ensure fixtures: pick@fixture.A/B, alias cmd1 → pick@fixture.B, longrun cancel, requires T11-T14, bridge, denylisted, events unsupported, RPC clone failure, and localized help/options.
- Maintain a separate smoke bundle for ad hoc manual checks such as `ok`, `okcmd`, and `canceldemo`.

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
- Ranked exact/prefix name and alias matching, MRU tie-breaking, and no-such-command behavior.
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
