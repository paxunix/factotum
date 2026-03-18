Below is a **Test Plan v1** that mixes a small, reliable **manual smoke suite** (fast to run while iterating) with a few **automation-friendly harness tests** that are realistic for a Chrome MV3 extension. I’m keeping it focused on the contracts you’ve settled.

---

# Test Plan v1

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Source of truth for behaviors under test; use to resolve ambiguities.
- `PLAN.md`: Maps milestones to which tests must pass.
- `fixture-pack.md`: Canonical fixtures bundle used in harness/manual checks.
- `DEVELOPING.md`: RPC/bridge/requires details and troubleshooting guidance.

## 0) Test environments

### Required environments

* **Chrome Stable** (current) with MV3 enabled (default)
* **One “normal” page** (minimal CSP), e.g. a simple local HTML page
* **One “locked down” page** (strict CSP / restrictive), for negative testing (any real-world site with strict CSP is fine)
* **One restricted Chrome page** (e.g. `chrome://extensions/`) to validate non-injectable handling

### Required extension configuration

* Omnibox keyword configured (e.g., `f`)
* `<all_urls>` host permissions and broad permissions as per v1
* Test Fcommands imported/installed:

  * `oops@demo.debug.error`
  * `libdemo@demo.require.script`
  * `bmkclean@demo.bookmarks.cleaner`
  * `jsonview@demo.json.viewer`

---

## 1) Manual smoke suite (must pass before “v1 complete”)

Each test lists: **Setup → Action → Expected**.

### 1.1 Omnibox resolution

#### T1: Exact alias expansion wins over command name

* Setup: define alias `cmd1 → oops@demo.debug.error`
* Action: omnibox `f cmd1`
* Expected:

  * Omnibox suggestions may preview the resolved command and its description
  * Runs `oops@demo.debug.error` (overlay shows that)
  * MRU for that command updates immediately
  * Log includes at least one entry (even if command does nothing visible)

#### T2: Fully qualified command runs exact match

* Action: `f oops@demo.debug.error`
* Expected:

  * Correct command runs
  * Overlay shows `oops@demo.debug.error`

#### T3: Bare name resolves MRU-first

* Setup: two commands share same name `jsonview@A` and `jsonview@B`
* Action:

  1. run `f jsonview@B`
  2. run `f jsonview`
* Expected:

  * Second invocation runs `jsonview@B` (MRU-first)
  * MRU updates on invocation start

#### T3b: Disabled commands are excluded

* Setup: mark `jsonview@B` as disabled.
* Action: run `f jsonview`
* Expected:

  * Disabled command is skipped.
  * Next MRU-enabled command is selected, or “No such command” if none.

#### T4: No such command suggestion + overlay error

* Action: `f nosuchcmd`
* Expected:

  * Omnibox shows “No such command: nosuchcmd”
  * Selecting it / pressing Enter shows overlay error (if injectable)
  * Log contains error entry with `NO_SUCH_COMMAND`

#### T4a: Prefix-matched command suggestions are informational

* Setup: installed commands include `jsonview@A` and `jsonview@B`
* Action: type `f jso`
* Expected:

  * Omnibox suggestions include `jsonview` entries with description text
  * Selecting a suggestion inserts or executes that suggestion content
  * If the user simply presses Enter on the unmatched free-typed text, normal v1 resolution rules still apply

#### T4b: Localized description in UI

* Setup: command `description` is a `LocalizedText` map with `en-US` + another language.
* Action: switch UI language preference to that language (Chrome UI language or test override).
* Expected:

  * Manager/chooser UI shows the localized description.
  * If no matching locale, it falls back to `en-US`.

---

### 1.2 Injection / page eligibility

#### T5: Non-injectable page hard error

* Setup: open `chrome://extensions/`
* Action: `f oops@demo.debug.error`
* Expected:

  * Command does not run
  * Hard error: “Cannot run on this page”
  * Log contains `CANNOT_INJECT`

#### T6: Top-frame-only injection

* Setup: open a page with an iframe
* Action: run a command that logs `location.href` from both worlds if it tries (or just verify overlay appears once)
* Expected:

  * Overlay appears once (top frame)
  * No per-frame duplication

---

### 1.3 Overlay behavior

#### T7: Overlay always appears and signals completion

* Action: `f oops@demo.debug.error`
* Expected:

  * Overlay appears (Running…)
  * Overlay transitions to Done quickly (for non-failing run)

#### T7b: `--help` shows localized help HTML

* Setup: command provides `helpHtmlTemplate` + `helpHtmlStrings` with `en-US` + another language.
* Action: run `f cmd --help` with UI language set to the other language.
* Expected:

  * Help overlay shows the localized HTML.
  * Fallback to `en-US` if no matching locale is present.

#### T7c: Options spec generates help tokens

* Setup: command provides `optionsSpec` with at least one option and args.
* Action: run `f cmd --help`
* Expected:

  * Help overlay includes generated `usage`/`options`/`args` content.
  * Author-provided tokens remain localized.

#### T8: Cancel button cancels a running command

* Setup: a test command that loops with `await new Promise(r=>setTimeout(r,50))` and checks `ctx.signal.aborted`
* Action: start it, click Cancel
* Expected:

  * Overlay shows Canceled
  * Log contains cancellation entry
  * Any subsequent `ctx.chrome.*` calls from that command reject with `CANCELED`

---

### 1.4 Cancel-on-navigation

#### T9: Cancel on navigation commit

* Setup: command that runs for a few seconds
* Action: start command → navigate to a new URL (not hash-only)
* Expected:

  * Invocation cancels
  * Overlay shows Canceled (navigation)
  * RPC rejects with `CANCELED`
  * Busy state cleared (can run another command)

#### T10: Hash change does NOT cancel (v1 recommended behavior)

* Setup: same command running
* Action: change only `#hash` (same-document navigation)
* Expected:

  * Invocation continues (unless you explicitly chose otherwise)
  * If you later decide to cancel on hash, update this test

---

### 1.5 Requires loader

#### T11: Sequential requires order honored

* Setup: requires A then B; each logs a side effect (e.g. sets `window.__A` then B checks it)
* Action: run command
* Expected:

  * B observes A’s side effect
  * If A fails, B never loads

#### T12: `data:` in requires rejected

* Setup: command with `requires: [{url:"data:…", kind:"script"}]`
* Action: run command
* Expected:

  * Immediate failure
  * Log contains `REQUIRES_FAILED` with URL scheme noted

#### T13: MAIN module require uses dynamic import

* Setup: require `{kind:"module", url:https://.../mod.mjs}`
* Action: run command
* Expected:

  * Import completes (or fails) via MAIN host
  * Side effects visible to MAIN (e.g., module sets `window.__MOD_LOADED = true`)

#### T14: ISOLATED module require best-effort failure is clear

* Setup: require `{kind:"module", world:"isolated", url:https://...}`
* Action: run on a page where it will predictably fail (CORS/CSP)
* Expected:

  * Failure message is explicit (CORS/CSP/import failure)
  * Code = `REQUIRES_FAILED`

---

### 1.6 MAIN bridge

#### T15: `ctx.main.define/call` round-trip works

* Setup: define `add(a,b)` in MAIN
* Action: call it from ISOLATED command
* Expected:

  * Result returned correctly
  * No nonce spoofing accepted (see T16)

#### T16: Nonce mismatch messages ignored

* Setup: from page console, try posting a fake bridge message with wrong nonce (manual)
* Action: post `window.postMessage({fcmd:true, invocationId, nonce:"bad", ...}, "*")`
* Expected:

  * No handler execution
  * No unexpected log entries beyond optional “ignored message” debug (keep it quiet in v1)

---

### 1.7 RPC exposure

#### T17: Basic RPC works (bookmarks)

* Setup: ensure bookmarks permission and at least one bookmark exists
* Action: run `bmkclean@demo.bookmarks.cleaner` in “dry” mode (or a safe query)
* Expected:

  * `ctx.chrome.bookmarks.getTree()` returns data
  * Log shows match count

#### T18: Denylisted namespaces blocked

* Action: run a command that calls `ctx.chrome.debugger.attach` or `ctx.chrome.management.getAll`
* Expected:

  * Rejected with `UNSUPPORTED_MEMBER` (or equivalent)
  * Log includes method name

#### T19: Event usage rejected

* Action: command tries `ctx.chrome.bookmarks.onChanged.addListener(...)`
* Expected:

  * Throws/rejects with `UNSUPPORTED_API_SHAPE`
  * Log includes hint “events not supported in v1”

#### T20: Cloneability failure surfaces as `UNCLONEABLE_RESULT`

* Action: call a method known/constructed to return an uncloneable object (or simulate by returning an uncloneable from an override)
* Expected:

  * Rejection with `UNCLONEABLE_RESULT`

---

### 1.8 Logging UI

#### T21: Log entries appear, ordered oldest→newest

* Action: call `ctx.log("a"); ctx.log("b")`
* Expected:

  * Log shows “a” then “b”

#### T21b: Localized log entry display

* Action: call `ctx.log({ l10n: { "en-US": "Hello", "fr": "Bonjour" }, data: { n: 1 } })`
* Expected:

  * Log shows the localized string for the UI language.
  * Log detail view shows `data` stringified.
  * Fallback to `en-US` if no matching locale.

#### T21c: Extension UI labels use chrome.i18n

* Action: switch Chrome UI language to a non‑English locale and open manager/log UI.
* Expected:

  * All extension‑provided labels are localized via `chrome.i18n.getMessage`.

#### T22: Remove individual entry

* Action: remove a middle log entry
* Expected:

  * Entry disappears, no undo

#### T23: Clear all

* Action: clear
* Expected:

  * Empty log

#### T24: Retention cap 1000 drops oldest

* Setup: generate 1005 log entries quickly
* Expected:

  * Exactly 1000 remain
  * Oldest 5 dropped

---

## 2) Automation-friendly harness tests (realistic for MV3)

MV3 extension automation is limited, but you can still build a small harness:

### 2.1 In-extension harness page

Create a dedicated extension page (internal) `harness.html` that can:

* install known test commands into storage (index + command keys + aliases)
* open a test tab to a known URL (local server recommended)
* trigger an invocation by sending the SW the same message omnibox would produce (bypassing actual omnibox UI)
* query SW for:

  * session logs (read-only)
  * active invocation state (for asserts)

> This doesn’t change runtime behavior; it’s just a test driver.

### 2.2 Suggested automated tests

#### A1: Resolution + MRU update on start

* Install two commands with same name.
* Trigger fully qualified B.
* Trigger bare name.
* Assert bare name resolves to B.
* Assert MRU timestamps updated on invocation start.

#### A2: Cancel on navigation

* Start long-running command.
* Programmatically navigate tab to another URL.
* Assert invocation canceled and busy cleared.

#### A3: Requires failure yields log

* Install command with invalid requires URL.
* Start command.
* Assert log contains `REQUIRES_FAILED`.

#### A4: Bridge define/call

* Start ISOLATED command that defines MAIN function and calls it.
* Assert result logged.

#### A5: Denylisted namespace blocked

* Start command calling `chrome.management.getAll`.
* Assert `UNSUPPORTED_MEMBER` logged.

### 2.3 What to avoid automating (v1)

* Real omnibox suggestion UI (hard to automate reliably)
* CSP-dependent failures on third-party pages (too flaky)
* Chrome restricted pages (automation varies)

---

## 3) Test data and fixtures

### 3.1 Minimal local test page

Host a local page (or use a packaged test page served via extension web-accessible resources if you prefer) with:

* no CSP headers
* an iframe (for top-frame-only checks)
* a big text body for JSON tests

### 3.2 “Locked down” test page

Optional but useful:

* a page with strict CSP that blocks inline scripts and remote loads
* use it to verify graceful failure (`BRIDGE_FAILED`/`REQUIRES_FAILED`)

---

## 4) Exit criteria for v1

v1 is “feature complete” when:

* All **manual smoke suite** tests T1–T24 pass.
* At least **A1–A5** harness tests pass reliably on Chrome Stable.
* No test leaves the extension in “busy tab” state after completion/cancel.
* Session log always shows actionable errors for fatal failures.

---



=======================================================================


Here’s a spec-only `HARNESS.md` that describes an internal test harness page and the minimal, low-risk service-worker hooks you’d add to make A1–A5 automation reliable—without changing production behavior.

---

# HARNESS.md — Test Harness (v1)

## Purpose

The harness provides a deterministic way to:

* seed storage with known commands + aliases
* open a controlled test tab
* trigger invocations (without omnibox UI)
* read session logs + minimal invocation state for assertions

This is for developer testing only. It should be disabled or guarded behind a “dev mode” flag in production builds if you care.

---

## 1) Harness page

### 1.1 Location

An internal extension page, e.g.:

* `chrome-extension://<id>/harness.html`

It provides simple controls:

* “Reset storage”
* “Install fixtures”
* “Open test tab”
* “Run test case A1…A5”
* “Show logs”
* “Show active invocations”

### 1.2 Harness responsibilities

The harness:

1. Writes fixtures into `chrome.storage.local` using the **real** storage layout:

   * `fcmd:index`
   * `fcmd:aliases`
   * `fcmd:cmd:<name>@<id>`
2. Opens a test tab to a known URL (local server recommended).
3. Triggers invocations by sending a “start invocation” message to the service worker (SW).
4. Queries SW for:

   * current session log entries
   * active invocation state (minimal)
5. Runs assertions and prints pass/fail.

No omnibox interaction is required.

---

## 2) Minimal SW hooks (dev-only API)

### 2.1 Hook design goals

* Must not change production behavior.
* Must not expose sensitive data by default.
* Must be easy to disable.

### 2.2 Enablement

One of:

* `DEV_MODE` build flag (recommended)
* or a setting in `chrome.storage.local` like `fcmd:devmode=true` that is only set locally

All harness-only message handlers should require dev mode enabled.

---

## 3) Harness → SW message API

All harness messages use:

* `type: "fcmd_harness"`
* `op: ...`
* `requestId` for correlation

### 3.1 Start invocation (bypass omnibox)

**Request**

```json
{
  "type": "fcmd_harness",
  "op": "START",
  "requestId": "…",
  "tabId": 123,
  "input": "jsonview@demo.json.viewer --flag x"
}
```

**Behavior**

* SW executes the same resolution + invocation start path as omnibox:

  * tokenize, alias-expand, resolve, MRU update, injection, requires, run.
* This must call the same internal function omnibox would call, not a separate path.

**Response**

```json
{
  "type": "fcmd_harness_result",
  "requestId": "…",
  "ok": true,
  "invocationId": "…"
}
```

or error:

```json
{
  "type": "fcmd_harness_result",
  "requestId": "…",
  "ok": false,
  "error": { "code": "NO_SUCH_COMMAND", "message": "…" }
}
```

### 3.2 Get logs

**Request**

```json
{ "type": "fcmd_harness", "op": "GET_LOGS", "requestId": "…" }
```

**Response**

```json
{
  "type": "fcmd_harness_result",
  "requestId": "…",
  "ok": true,
  "logs": [ /* session log entries */ ]
}
```

Notes:

* Returns logs in oldest→newest order.
* Must reflect retention rules (max 1000).

### 3.3 Clear logs

**Request**

```json
{ "type": "fcmd_harness", "op": "CLEAR_LOGS", "requestId": "…" }
```

**Response**: ok

### 3.4 Get invocation state (minimal)

**Request**

```json
{ "type": "fcmd_harness", "op": "GET_STATE", "requestId": "…" }
```

**Response**

```json
{
  "type": "fcmd_harness_result",
  "requestId": "…",
  "ok": true,
  "activeInvocationsByTabId": { "123": "invocation-abc" },
  "invocations": {
    "invocation-abc": {
      "tabId": 123,
      "name": "jsonview",
      "id": "demo.json.viewer",
      "status": "RUNNING" | "DONE" | "ERROR" | "CANCELED",
      "startedAt": 1760000000000
    }
  }
}
```

Notes:

* Minimal info only; no code contents or secrets.
* Enough for harness assertions.

### 3.5 Cancel invocation

**Request**

```json
{ "type": "fcmd_harness", "op": "CANCEL", "requestId": "…", "invocationId": "…" }
```

**Response**: ok (even if already ended)

---

## 4) Fixture installation strategy

### 4.1 “Install fixtures” button

The harness page writes a known set of commands:

* two commands with same `name` different `id` (for MRU tests)
* a command with invalid requires URL (for requires failure)
* a command that uses `ctx.main.define/call` (for bridge)
* a command that calls denylisted namespace (for `UNSUPPORTED_MEMBER`)
* a long-running cancellable command (for cancel-on-navigation)

It also installs:

* one alias mapping that points to a fully-qualified token

### 4.2 Reset storage

Reset should:

* remove all keys starting with `fcmd:`
* then install fixtures fresh

---

## 5) Recommended harness assertions (A1–A5)

### A1: Resolution + MRU

* Start fully qualified command B.
* Start bare name.
* Assert second run chose B (by checking overlay log entries or invocation metadata).

### A2: Cancel on navigation

* Start long-running command.
* Navigate tab via `chrome.tabs.update({url: ...})`.
* Assert invocation status becomes `CANCELED` and busy state clears.

### A3: Requires failure log

* Start command with invalid require URL.
* Assert logs contain `REQUIRES_FAILED`.

### A4: Bridge define/call

* Start bridge command.
* Assert logs contain expected returned value.

### A5: Denylisted blocked

* Start command calling `chrome.management.*`.
* Assert error code `UNSUPPORTED_MEMBER` is logged.

---

## 6) Keeping harness from polluting production

* All harness op handlers should be behind dev mode.
* Consider naming these messages distinctly and rejecting them by default.
* Do not add any harness APIs that:

  * expose command code
  * allow arbitrary storage read/write (beyond fixture convenience)
  * allow arbitrary method execution bypassing the normal invocation pipeline

---
