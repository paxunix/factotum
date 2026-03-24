Here’s a `DEVELOPING.md`-style guide for extending the RPC exposure (“all chrome.* namespaces” minus denylist) plus a test checklist. It’s written to prevent the most common drift: missing promisification, accidental event exposure, uncloneables, and inconsistent error handling.

---

# DEVELOPING.md — Extending Fcommands RPC Exposure (v1)

## Overview

Fcommands access privileged APIs through `ctx.chrome`, a Proxy that forwards calls to the service worker (SW) via RPC. The SW exposes a “best-effort everything callable” surface:

* ✅ expose one-shot callable methods with cloneable args/results
* ❌ do **not** expose events, ports, or long-lived channels
* ❌ denylist certain namespaces entirely (`chrome.debugger`, `chrome.management`)
* ✅ wrap callback-based APIs into Promises so the runner sees `await`-able methods

This document explains how to add/maintain RPC exposure safely.

## Current execution direction

Command runtime now lives in `USER_SCRIPT` via `chrome.userScripts`. `MAIN` should be treated as a page bridge target reached through `ctx.main`, not as a symmetric top-level runtime. When making RPC or bridge changes, optimize for:

* USER_SCRIPT as the durable command runtime
* SW as the privileged/RPC control plane
* MAIN only for explicit page-context access

## Current UI direction

The current implementation now has reopenable per-tab overlay history plus active-state bubbles in the same session stream, alongside a separate log page. The next intended direction is a fuller per-tab session console overlay. When touching command-facing output or invocation UX, optimize for:

* per-tab session state, discarded on tab close, reopenable via `f -`
* command-visible scrollback in the overlay instead of a separate log page
* omnibox as the only input surface
* explicit command-facing output APIs (`ctx.out.*`) instead of relying on incidental `console.*` output

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Authoritative RPC policy and error codes; defer to it on conflicts.
- `AGENTS.md`: Mandatory guardrails for any change; read before editing.
- `TEST.md`: Required RPC/bridge/requires tests (T17–T20, T15–T16, T11–T14) after changes.
- `PLAN.md`: Milestone scope for RPC, bridge, requires, and logging work.
- `USER_GUIDE.md`: end-user-facing behavior to preserve when changing UX.
- `FCMD_AUTHORING.md`: author-facing behavior to preserve when changing fcommand APIs.

If a change affects either audience directly, update the matching guide in the same checkpoint instead of leaving it for later.

---

# UI dependency note (v1 steering)

UI pages should use Web Awesome web components as much as possible. Web Awesome must be bundled locally (no CDN runtime dependencies) to comply with v1 build constraints.

---

# Localization note (v1 steering)

All extension UI strings must come from `chrome.i18n.getMessage` (`_locales`), with `en-US` fallback. Ensure `manifest.json` sets `default_locale` when `_locales/` is present; `__MSG_key__` may be used in manifest/CSS. Dates and other locale‑sensitive data should use `Intl` with the UI language preference. Command metadata `description` is localized via `LocalizedText` maps; help HTML should use `helpHtmlTemplate` + localized `helpHtmlStrings` as defined in the v1 spec.

---

## 1) RPC exposure policy (source of truth)

### 1.1 Exposed

A method is eligible if:

* It is a function: `typeof chrome[ns][method] === "function"`
* It can be invoked as a one-shot: no listeners, no `connect()`, no port
* Arguments are structured-cloneable (or can be converted to such before sending)
* Result is structured-cloneable

### 1.2 Not exposed

* Any `onXxx` events (and anything that returns/accepts listeners)
* Any port/channel creators (`runtime.connect`, etc.)
* Any API shapes that are non-callable properties
* Any method that returns non-cloneable objects

### 1.3 Denylisted namespaces (v1)

* `chrome.debugger`
* `chrome.management`

These are blocked even if they are callable.

---

## 2) How methods are resolved and dispatched

### 2.1 Method string format

RPC methods are `"namespace.method"`.

Example:

* `"bookmarks.search"` calls `chrome.bookmarks.search(...)`.

No deeper paths in v1 unless they exist as direct callables.

### 2.2 Dispatch algorithm

Given `method = "ns.fn"`:

1. Reject if `ns` denylisted.
2. Lookup `api = chrome[ns]` and `fn = api[fnName]`.
3. Reject if missing or not a function.
4. Reject if function is an event/port pattern (see §3).
5. Invoke wrapped in a Promise (promisify if needed).
6. Return `result` if cloneable; else reject with `UNCLONEABLE_RESULT`.

---

## 3) Detecting “event or port” shapes

### 3.1 Events

Events typically look like objects with `addListener/removeListener/hasListener`.

Rule:

* Never expose any property whose value is an object with `addListener` or `removeListener`.
* Never expose methods named:

  * `addListener`
  * `removeListener`
  * `hasListener`
  * `hasListeners`

### 3.2 Ports / long-lived channels

Common patterns:

* `runtime.connect`, `tabs.connect`, etc.
* anything returning a `Port` object (non-cloneable, long-lived)

Rule:

* Explicit denylist port creators by method name:

  * `runtime.connect`
  * `runtime.connectNative`
  * `tabs.connect`
  * any other `*.connect*` returning a Port

If you later want ports, that’s a v2 feature with a subscription protocol.

---

## 4) Promisification rules

Chrome APIs are not uniformly Promise-native. The SW must ensure RPC is always promise-based.

### 4.1 Preferred approach

* If calling a method that returns a Promise (some do), await it.
* Otherwise, wrap callback-style methods:

Pattern:

* Append a callback and resolve/reject based on `chrome.runtime.lastError`.

Pseudo-behavior:

* `fn(...args, (result) => { if (lastError) reject(lastError); else resolve(result); })`

### 4.2 Multiple callback parameters

Some callbacks return multiple values. Decide a convention:

v1 convention (recommended):

* If callback receives multiple args, return them as an array.

Example:

* callback `(a, b)` → result `[a, b]`

Document this in a small table if you encounter it.

### 4.3 “No callback result” methods

Methods like `remove()` may only signal completion:

* resolve `undefined` on success.

---

## 5) Structured clone and sanitization

### 5.1 Arguments

Runner should only send cloneable args, but SW should still guard:

* If args include unsupported types, reject with `RPC_FAILED` + details.

### 5.2 Results

After obtaining `result`:

* If structured clone fails (or you detect problematic types), reject with:

  * `code: "UNCLONEABLE_RESULT"`
  * include method name in details

Tip:

* Many Chrome API results are cloneable plain objects; ports and DOM-related objects are not.

---

## 6) Error handling contract

### 6.1 Normalize every error

SW must return errors with fields:

* `name`, `message`, optional `stack`, `code`, optional `details`

Preferred codes:

* `NO_SUCH_METHOD`
* `UNSUPPORTED_MEMBER`
* `UNSUPPORTED_API_SHAPE`
* `UNCLONEABLE_RESULT`
* `RPC_FAILED`
* `CANCELED`
* `INVALID_INVOCATION`

### 6.2 Don’t leak raw Error objects across boundaries

Always convert to a plain object (cloneable). Preserve stack when available.

---

## 7) Adding a new namespace or method

Even though v1 aims to expose “everything callable,” in practice you’ll need a deny/override file for edge cases.

### 7.1 Update the denylist if necessary

If a namespace is too risky or mostly non-RPC-friendly:

* add it to the denylist.

### 7.2 Add method-level exclusions (optional)

If only specific methods are problematic (ports, listeners):

* add `ns.method` to a method denylist.

### 7.3 Add promisify overrides (optional)

If a method has unusual callback shape:

* implement a wrapper override for that method that adapts its callback to your v1 return convention.

---

## 8) Test checklist (required before merging changes)

### 8.1 RPC basics

* [ ] Calling a known method returns expected result.
* [ ] Missing method returns `NO_SUCH_METHOD`.
* [ ] Denylisted namespace returns `UNSUPPORTED_MEMBER`.
* [ ] Event-like members cannot be called (error `UNSUPPORTED_API_SHAPE`).

### 8.2 Promisification

* [ ] Callback-style method resolves correctly.
* [ ] `chrome.runtime.lastError` causes rejection with `RPC_FAILED`.
* [ ] Multi-arg callback returns an array (if encountered).

### 8.3 Invocation binding

* [ ] RPC rejects when `invocationId` is unknown (`INVALID_INVOCATION`).
* [ ] RPC rejects after cancel (`CANCELED`).
* [ ] RPC rejects if tabId mismatches the invocation.

### 8.4 Cloneability

* [ ] If method returns uncloneable, error `UNCLONEABLE_RESULT` is returned and logged.

### 8.5 Cancel-on-navigation

* [ ] Starting a command then navigating cancels it.
* [ ] Cancel prevents further RPC calls.

### 8.6 Logging

* [x] Command-facing output (`ctx.out.*`) appears in the session console UI.
* [ ] Fatal wrapper failures (requires fail, uncaught exception) appear in the session console or other visible session diagnostics even if command didn’t log.

### 8.7 Requires loader

* [ ] Sequential requires order honored.
* [ ] `data:` require rejected.
* [ ] MAIN script require loads and runs.
* [ ] MAIN module require uses dynamic import.
* [ ] USER_SCRIPT module require best-effort fails with clear log if blocked.

### 8.8 Bridging

* [ ] `ctx.main.define/call` works on a normal page.
* [ ] Bridge messages require correct `nonce` (spoofing attempt ignored).
* [ ] Bridge failure produces `BRIDGE_FAILED` and logs.

---

## 9) Notes on “works everywhere” expectations

Some pages will block:

* injected scripts
* dynamic import
* any MAIN-world execution

This is acceptable in v1. The correct behavior is:

* fail clearly
* log the error
* keep the extension stable

---


Here’s a concise **Troubleshooting** section you can append to `DEVELOPING.md`. It’s geared toward interpreting the session log and quickly narrowing down whether a failure is injection, requires, bridge, RPC dispatch, or command code.

---

# Troubleshooting

This extension is intentionally a “sharp knife.” When something fails, the goal is not to hide it—it’s to make the failure **obvious** and **actionable** without requiring DevTools.

## 1) First step: identify the failure stage

Every serious failure should produce at least one `error`-level entry in the **session log**. Determine which stage failed:

1. **Injection** (overlay/runner didn’t start)
2. **Requires** (dependency load/import failed)
3. **Bridge** (MAIN define/call/import failed)
4. **RPC** (privileged API call failed)
5. **Command runtime** (exception thrown by user code)

The error codes and typical symptoms below map to these stages.

---

## 2) Common error codes and what they mean

### `CANNOT_INJECT`

**Stage:** Injection
**Symptoms:**

* Overlay shows “Cannot run on this page,” or overlay never appears.
  **Common causes:**
* Tab is a restricted page (`chrome://`, Chrome Web Store, etc.)
* Missing permissions/host permissions (if manifest was changed)
  **What to check:**
* Current tab URL scheme
* `scripting.executeScript` errors in SW console (dev-only)

---

### `TAB_BUSY`

**Stage:** Pre-flight
**Symptoms:**

* Overlay says a command is already running.
  **Common causes:**
* Previous invocation never resolved/rejected (hung command)
  **What to do:**
* Use Cancel on overlay or navigate to cancel-on-navigation.

---

### `NO_SUCH_COMMAND`

**Stage:** Resolution
**Symptoms:**

* Omnibox suggestion “No such command: …”
* Overlay error after selection
  **Common causes:**
* User typed wrong `name@id`
* Alias points to a removed command
  **What to check:**
* `fcmd:index` contains the command
* Alias mapping in `fcmd:aliases`

---

### `REQUIRES_FAILED`

**Stage:** Requires
**Symptoms:**

* Overlay goes to Error quickly after “Running…”
* Log entry mentions a URL and kind `script`/`module`
  **Common causes:**
* Network failure or blocked CDN
* CORS failure for module imports
* Page CSP blocks script execution
  **What to check:**
* Requires URL correctness, scheme (`https:`)
* Whether it’s `script` vs `module`
* Try a simpler page to confirm it’s CSP-related

---

### `BRIDGE_FAILED`

**Stage:** MAIN bridging / MAIN module import
**Symptoms:**

* `ctx.main.define` or `ctx.main.call` rejects
* MAIN module requires fail (since they use MH `import`)
  **Common causes:**
* Page CSP / Trusted Types restrictions interfering with MAIN host
* MH injection blocked
* Nonce mismatch (spoofing prevention)
  **What to check:**
* Whether MH was successfully injected
* That bridge messages include correct `invocationId` and `nonce`
* Reproduce on a non-restrictive page (e.g., a simple test page) to isolate CSP

---

### `NO_SUCH_METHOD`

**Stage:** RPC dispatch
**Symptoms:**

* `ctx.chrome.some.ns.method` rejects immediately
  **Common causes:**
* Method name doesn’t exist in that Chrome version
* Proxy generated a method string that doesn’t match actual API layout
  **What to check:**
* Confirm `chrome[ns][method]` exists in SW context
* Ensure method naming is exactly `ns.method`

---

### `UNSUPPORTED_MEMBER` / `UNSUPPORTED_API_SHAPE`

**Stage:** RPC policy
**Symptoms:**

* Rejection when calling event-ish or denylisted APIs
  **Common causes:**
* Attempting to call events (`onChanged.addListener`)
* Attempting to use `chrome.debugger` or `chrome.management`
* Attempting to use port-based APIs (`runtime.connect`)
  **What to do:**
* Document that v1 does not support events/ports
* For denylisted namespaces, confirm intentional exclusion

---

### `UNCLONEABLE_RESULT`

**Stage:** RPC return marshaling
**Symptoms:**

* SW call succeeded but result could not be returned to runner
  **Common causes:**
* Method returns a complex/host object
* Something in result graph not structured-cloneable
  **What to do:**
* Add method-level override to sanitize result
* Or mark method unsupported if it can’t be reasonably represented

---

### `RPC_FAILED`

**Stage:** RPC execution
**Symptoms:**

* Error message often mirrors `chrome.runtime.lastError`
  **Common causes:**
* Missing permissions
* Invalid args
* Underlying Chrome API error
  **What to check:**
* Permissions in manifest
* Args passed to the method
* Whether the call requires a user gesture or special context

---

### `CANCELED`

**Stage:** Cancellation
**Symptoms:**

* RPC calls start rejecting with `CANCELED`
* Overlay shows Canceled
  **Common causes:**
* User canceled
* Navigation committed
* Tab closed
  **What to do:**
* In commands, check `ctx.signal.aborted` in loops
* Don’t assume long RPC chains will complete if the user navigates

---

### `INVALID_INVOCATION`

**Stage:** Invocation binding
**Symptoms:**

* RPC rejects early even though method exists
  **Common causes:**
* Runner is still sending messages after invocation ended
* TabId mismatch
* InvocationId reused incorrectly (should never happen)
  **What to check:**
* Invocation lifecycle bookkeeping in SW maps
* Ensure teardown removes handlers and stops runners

---

## 3) Diagnosing by symptom (quick map)

### Overlay never appears

* Likely `CANNOT_INJECT` (restricted page) or injection error
* Confirm active tab is injectable.

### Overlay appears, then instant error before any command logs

* Usually `REQUIRES_FAILED` or `BRIDGE_FAILED` during startup
* Look for URL/kind in the log entry.

### Command logs appear, then RPC fails

* Usually `RPC_FAILED` (permissions/args) or `NO_SUCH_METHOD`
* Log should show method name.

### Command hangs “Running…” forever

* Command never resolves/rejects; no timeouts by design
* Use Cancel or navigate to trigger cancel-on-navigation.

---

## 4) Recommended “debug pages” for reproduction

When a failure might be CSP-related, test on a simple page:

* a locally hosted minimal HTML page
* a data-free static page with minimal CSP (not a restricted scheme)

This isolates:

* whether MH injection works
* whether dynamic import works
* whether script requires load at all

---

## 5) What must always be logged

Even if a command writes no logs, the runtime should emit at least one `error` entry for:

* injection failure
* requires failure
* bridge failure
* uncaught exception from `main()`
* RPC dispatch failures (`NO_SUCH_METHOD`, etc.)

This is the “no DevTools required” guarantee.

---

If you’d like, I can also draft a **“Test Plan v1”** that lists a small set of manual smoke tests plus a couple automated harness tests (where feasible in an extension) to validate omnibox resolution, MRU, requires order, bridge correctness, and cancellation.
