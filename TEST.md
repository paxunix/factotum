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
* Canonical fixture bundle imported from [`fixtures/fixtures-v1.json`](/home/paxunix/repos/factotum/fixtures/fixtures-v1.json):

  * `pick@fixture.A`
  * `pick@fixture.B`
  * `longrun@fixture.cancel.nav`
  * `badreq@fixture.requires.fail`
  * `reqorder@fixture.requires.order`
  * `reqdata@fixture.requires.data`
  * `reqmod@fixture.requires.main.module`
  * `requsermod@fixture.requires.user.module.fail`
  * `bridge@fixture.main.bridge`
  * `deny@fixture.denylisted`
  * `events@fixture.events.unsupported`
  * `workflow@fixture.sw.roundtrip`
  * `clonefail@fixture.rpc.uncloneable`
  * `helpdemo@fixture.help.basic`
* Ad hoc manual smoke fixtures imported from [`fixtures/smoke-v1.json`](/home/paxunix/repos/factotum/fixtures/smoke-v1.json) when needed:

  * `ok@demo.ok`
  * `canceldemo@demo.cancel`
  * `outputdemo@demo.output`

### Fixture map

Use these fixtures for the following tests so the test plan stays aligned with the maintained bundle and ad hoc smoke commands:

* `ok@demo.ok`: T1, T2, T5, T7
* `pick@fixture.A` and `pick@fixture.B`: T3, T3b, T4a, T4b
* `canceldemo@demo.cancel`: T8
* `outputdemo@demo.output`: T21, T21b
* `longrun@fixture.cancel.nav`: T9, T10
* `badreq@fixture.requires.fail`: external requires-failure check
* `reqorder@fixture.requires.order`: T11
* `reqdata@fixture.requires.data`: T12
* `reqmod@fixture.requires.main.module`: T13
* `requsermod@fixture.requires.user.module.fail`: T14
* `bridge@fixture.main.bridge`: T15
* `deny@fixture.denylisted`: T18
* `events@fixture.events.unsupported`: T19
* `workflow@fixture.sw.roundtrip`: T17
* `clonefail@fixture.rpc.uncloneable`: T20
* `helpdemo@fixture.help.basic`: T7b, T7c

---

## 1) Manual smoke suite (must pass before “v1 complete”)

Each test lists: **Setup → Action → Expected**.

### 1.1 Omnibox resolution

#### T0: `f -` reopens the current tab session console

* Setup: in a normal page, run any fcommand once, then dismiss the session console
* Action: enter `f -`
* Expected:

  * No command executes
  * The current tab’s existing Factotum session console reappears
  * Prior scrollback bubbles for that tab are still present

#### T1: Exact name outranks exact alias and prefix matches

* Setup:

  * install `ok@demo.ok`
  * define alias `ok → pick@fixture.B`
* Action: omnibox `f ok`
* Expected:

  * Runs `ok@demo.ok` (overlay shows that)
  * Omnibox suggestions rank the exact command-name match ahead of alias and prefix matches
  * MRU for that command updates immediately
  * Log includes at least one entry (even if command does nothing visible)

#### T2: Exact alias resolves MRU-first among alias targets

* Setup: define alias `okcmd` targeting `ok@demo.ok` and another enabled command with a lower `mruAt`
* Action: `f okcmd`
* Expected:

  * Runs the highest-MRU enabled command among the alias targets
  * Omnibox suggestions list the alias-target candidates in rank order

#### T3: Bare name resolves MRU-first

* Setup: two commands share same name `pick@fixture.A` and `pick@fixture.B`
* Action:

  1. run `f pick@fixture.B`
  2. run `f pick`
* Expected:

  * Second invocation runs `pick@fixture.B` (MRU-first)
  * MRU updates on invocation start

#### T3b: Disabled commands are excluded

* Setup: mark `pick@fixture.B` as disabled.
* Action: run `f pick`
* Expected:

  * Disabled command is skipped.
  * Next MRU-enabled command is selected, or “No such command” if none.

#### T4: No such command suggestion + overlay error

* Action: `f nosuchcmd`
* Expected:

  * Omnibox shows “No such command: nosuchcmd”
  * Selecting it / pressing Enter appends a no-such-command error bubble to the session stream (if injectable)
  * Log contains error entry with `NO_SUCH_COMMAND`

* Busy-tab edge case:

  * If another command is already running in the tab, entering `f nosuchcmd` must not clobber the active invocation overlay or strand the busy guard.
  * Instead, a separate no-such-command system bubble is appended while the running command remains active/cancelable.
  * The active invocation should remain cancelable and the tab should become runnable again once that invocation ends or is canceled.

#### T4a: Prefix-matched name and alias suggestions drive default execution

* Setup:

  * installed commands include `pick@fixture.A`, `pick@fixture.B`, and an alias `piquick -> pick@fixture.B`
  * `pick@fixture.B` has the newer MRU
* Action: type `f pi`
* Expected:

  * Omnibox suggestions include case-insensitive matches from both command names and alias keys
  * Suggestions are ordered by exact-name, exact-alias, name-prefix, alias-prefix, then MRU within each bucket
  * Pressing Enter without changing selection runs the first suggestion
  * Arrow-selecting another suggestion runs that selected command instead

#### T4b: Localized description in UI

* Setup: command `description` is a `LocalizedText` map with `en-US` + another language.
* Action: switch UI language preference to that language (Chrome UI language or test override).
* Expected:

  * Manager/chooser UI shows the localized description.
  * If no matching locale, it falls back to `en-US`.

#### T4c: Quarantined invalid stored command does not poison export

* Setup:

  1. install or store a command that was valid before but is now invalid under current validation rules
  2. keep at least one other valid command installed
* Action:

  1. open the manager UI
  2. export the bundle
  3. re-import that exported bundle into clean storage
* Expected:

  * Manager shows the stale command as invalid/quarantined with the validation reason
  * Export succeeds instead of failing the whole operation
  * Manager import/export diagnostics render one message per line so warnings and quarantine summaries are readable
  * Import diagnostics include one `Imported command: name@id` line per imported valid command
  * Exported JSON includes valid commands in `commands[]`
  * Exported JSON preserves the quarantined record in `invalidCommands[]`
  * Re-import restores the invalid record in quarantined form without making it runnable
  * Valid commands continue to work normally

#### T4d: Manager edits an existing valid command

* Setup: import `fixtures/smoke-v1.json` or another bundle with at least one valid command.
* Action:

  1. open the manager UI
  2. select a valid command card
  3. change the description JSON and command code
  4. save the command
  5. export the bundle
* Expected:

  * Selecting a valid command card opens the editor with editable Name, ID, and Version fields in the Identity section.
  * Editor sections include Identity, Description, Help, Options, Requires, Code, and Export
  * The Identity section includes editable Name, ID, and Version fields plus an editable single-line alias field using a space-delimited list of alias keys.
  * The selected command card has both an enable/disable switch and a clickable Enabled/Disabled status pill, and either control toggles command availability.
  * The selected command card has a trash button that is disabled for enabled commands, becomes active after disabling, and permanently deletes the command while removing any alias targets pointing at it.
  * Editable body fields include description JSON, code, help template, help strings JSON, optionsSpec JSON, and requires JSON
  * Save reports `Saved command: name@id`
  * Save Command is disabled until an editable field differs from the loaded command, and Reset disables it again.
  * Trying to select a different command while unsaved edits exist keeps the current command loaded and shows a save-or-reset warning.
  * Returning the editor contents to the loaded state disables Save Command and dismisses the save-or-reset warning.
  * Reloading or navigating away while unsaved edits exist triggers the browser's unsaved-changes prompt.
  * Saving after changing Name or ID moves the command to the new identity and does not leave the old command behind.
  * Saving is blocked if another command already uses the edited `name@id`.
  * Invalid JSON in JSON fields reports an inline editor error and does not save
  * Warning and error status messages in the manager can be dismissed directly from the status area.
  * Exported JSON contains the saved edits

#### T4d2: Manager creates a new valid command

* Setup: open the manager UI.
* Action:

  1. click `New Command`
  2. fill in Name and ID
  3. optionally add version, aliases, description, or code edits
  4. save the command
* Expected:

  * The editor opens a new-command draft without requiring bundle import first.
  * Draft Identity fields are editable and Save stays disabled until the draft is changed.
  * Reset restores the initial draft defaults instead of closing the editor.
  * Saving a valid draft adds the new command to the installed command list and selects it.
  * The saved command can be exported from the per-command Export section as a single command record and from Utilities export as part of the full bundle.

#### T4e: Manager uses the tabbed two-pane editor layout

* Setup: open the manager UI on a desktop-width window.
* Action: import a fixture bundle and select a valid command for editing.
* Expected:

  * Manager presents top-level Manager and Utilities tabs.
  * The Manager tab contains command navigation and a wide command editor pane.
  * The Utilities tab contains import/export tools, and the JSON field fills the pane with its own scrollbar.
  * Each pane scrolls independently; the whole manager page does not jump while browsing long pane contents.
  * The command list is a concise vertical tab menu of command names with one detail card for the selected command.
  * The filter input matches substrings in command name, command ID, or command aliases.
  * The sort selector supports Modified time, Name, and ID, defaults to descending Modified time, and uses a Material Symbols direction icon.
  * The selected command detail card shows command name as the primary title and command ID as secondary metadata.
  * The command editor uses vertical section tabs for Identity, Description, Help, Options, Requires, Code, and Export.
  * The command list controls include a `New Command` action that opens a draft in the editor pane.
  * The Code section gets the full editor pane height and scrolls code internally.
  * Editor fields use Web Awesome controls for simple field edits.
  * Code editing uses the bundled CodeMirror JavaScript editor with the default `basicSetup` editing affordances.
  * Help HTML template editing uses the bundled CodeMirror HTML editor with the default `basicSetup` editing affordances.
  * The Code and Help template editors have explicit `JS`, `HTML`, and `CSS` toolbar buttons that reformat the current CodeMirror selection with the chosen Prettier parser.
  * With no selection, the chosen formatter applies to the whole editor document.
  * With a selection, the chosen formatter applies only to that selected text, so embedded snippets can be reformatted independently of the surrounding editor language.
  * Invalid content for a chosen parser reports an inline editor error and does not mutate the editor contents.
  * The Export section shows a read-only JSON object for the current edited command only, with no alias data and no bundle wrapper.
  * Utilities import accepts either that single command JSON object or a full bundle JSON object.
  * Importing a single command JSON object aborts with an error instead of overwriting if an installed command with the same `name@id` already exists and differs from the input JSON.
  * Undo in either CodeMirror editor stops at the loaded command content and does not walk backward through prior command selections or the initial empty editor.
  * Disabled commands are visually muted in both the command menu and selected-command detail card while keeping the Disabled status pill clickable.
  * Selecting an editor section moves focus into that section: first field for form sections, Help template editor for Help, and current cursor position for Code.
  * Existing import/export, enable/disable, and save behavior still works.

---

#### T4f: optionsSpec drives parsed argv contract

* Setup: use a command with `optionsSpec` declaring `["-d", "--delete"]` as a boolean option and `args` usage text.
* Action:

  1. run the command with positional args and `--delete`
  2. run the command with positional args and `-d`
  3. run the command with an undeclared option such as `--bogus`
* Expected:

  * `main(argv, ctx)` receives `argv.tokens` as the raw post-command tokens
  * `main(argv, ctx)` receives `argv.positionals` as parsed positional args
  * `main(argv, ctx)` receives `argv.options.delete === true` for both `--delete` and `-d`
  * `optionsSpec.args` is help/usage text only and does not create named positional properties
  * unknown flags fail before `main()` executes when `optionsSpec.options` declares an option set

---

### 1.2 Injection / page eligibility

#### T5: Non-injectable page hard error

* Setup: open `chrome://extensions/`
* Action: `f ok`
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

* Action: `f ok`
* Expected:

  * Overlay appears once in the top frame, horizontally centered near the top of the page
  * Overlay shows the command outcome as a bubble in the session stream
  * Overlay does not auto-dismiss; it remains visible until user close

#### T7b: `--help` shows localized help HTML

* Setup: import the canonical fixture bundle and use `helpdemo@fixture.help.basic`, which provides `helpHtmlTemplate` + `helpHtmlStrings` with `en-US` + `fr`.
* Action: run `f helpdemo --help` with UI language set to `fr`.
* Expected:

  * Help overlay shows the localized HTML.
  * Fallback to `en-US` if no matching locale is present.

#### T7c: Options spec generates help tokens

* Setup: import the canonical fixture bundle and use `helpdemo@fixture.help.basic`, which provides `optionsSpec` with args and at least one option.
* Action: run `f helpdemo --help`
* Expected:

  * Help overlay includes generated `usage`/`options`/`args` content.
  * Author-provided tokens remain localized.
  * Help is shown as a bubble in the session stream, not a special takeover card.

#### T8: Cancel button cancels a running command

* Setup: install `canceldemo@demo.cancel`, a test command that loops with `await new Promise(r=>setTimeout(r,50))` and checks `ctx.signal.aborted`
* Action: start `f canceldemo@demo.cancel`, click Cancel
* Expected:

  * Overlay shows running and canceled states as bubbles in the same session stream
  * Log contains cancellation entry
  * Any subsequent `ctx.chrome.*` calls from that command reject with `CANCELED`
  * If another command is attempted while the tab is busy, the session console appends a busy bubble naming the running command and telling the user to cancel or wait

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

* Setup: import `reqorder@fixture.requires.order`
* Action: run `f reqorder@fixture.requires.order`
* Expected:

  * Session console output includes `require order=a,b`
  * Final state is `Done.`

#### T12: `data:` in requires rejected

* Setup: import `reqdata@fixture.requires.data`
* Action: run `f reqdata@fixture.requires.data`
* Expected:

  * Immediate failure
  * Session console error includes `Requires cannot use data: URLs`
  * SW console reports `REQUIRES_FAILED`
  * `main()` does not run

#### T13: MAIN module require uses dynamic import

* Setup: import `reqmod@fixture.requires.main.module`
* Action: run `f reqmod@fixture.requires.main.module`
* Expected:

  * Session console output includes `module loaded=true`
  * Final state is `Done.`

#### T14: USER_SCRIPT module require best-effort failure is clear

* Setup: import `requsermod@fixture.requires.user.module.fail`
* Action: run `f requsermod@fixture.requires.user.module.fail`
* Expected:

  * Failure message identifies USER_SCRIPT module require failure
  * SW console reports `REQUIRES_FAILED`
  * `main()` does not run

---

### 1.6 MAIN bridge

#### T15: `ctx.main.define/call` round-trip works

* Setup: define `add(a,b)` in MAIN
* Action: call it from USER_SCRIPT command
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
* Action: run `workflow@fixture.sw.roundtrip`
* Expected:

  * `ctx.chrome.tabs.query()` and `ctx.chrome.bookmarks.search()` return data
  * Page banner shows the active tab title and bookmark status
  * Session console settles to `Done.`

#### T18: Denylisted namespaces blocked

* Action: run a command that calls `ctx.chrome.debugger.attach` or `ctx.chrome.management.getAll`
* Expected:

  * Rejected with `UNSUPPORTED_MEMBER`
  * Session console error text includes the blocked method name

#### T19: Event usage rejected

* Action: command tries `ctx.chrome.bookmarks.onChanged.addListener(...)`
* Expected:

  * Throws/rejects with `UNSUPPORTED_API_SHAPE`
  * Session console error text includes “events not supported in v1”

#### T20: Cloneability failure surfaces as `UNCLONEABLE_RESULT`

* Action: run `clonefail@fixture.rpc.uncloneable`
* Expected:

  * Rejection with `UNCLONEABLE_RESULT`

---

### 1.8 Session Console Output

#### T21: Command output entries appear, ordered oldest→newest

* Setup: import `outputdemo@demo.output`
* Action: run `f outputdemo@demo.output`
* Expected:

  * Session console shows “a” then “b”

#### T21b: Localized output entry display

* Setup: import `outputdemo@demo.output`
* Action: run `f outputdemo@demo.output` with page language set to `fr`
* Expected:

  * Session console shows the localized string for the UI language.
  * Entry detail/expanded view shows `data` stringified.
  * Fallback to `en-US` if no matching locale.

#### T21c: Session console labels use chrome.i18n

* Action: switch Chrome UI language to a non‑English locale and open the session console.
* Expected:

  * All extension‑provided labels are localized via `chrome.i18n.getMessage`.

#### T22: Clear session scrollback

* Action: clear scrollback in the session console
* Expected:

  * Session scrollback is emptied for the current tab only

#### T22a: Session console layout is desktop-friendly

* Setup: open the session console on a normal desktop-width page
* Action: drag the scrollback region resize handle
* Expected:

  * Default console width is visibly wider than the old narrow card layout
  * Scrollback region resizes vertically
  * Resizing does not break bubble rendering or controls

#### T23: Session scrollback is per-tab and discarded on tab close

* Setup: create visible scrollback in two different tabs
* Action: close one tab
* Expected:

  * The closed tab’s scrollback is gone
  * The other tab’s session scrollback remains unaffected

#### T24: Retention cap 1000 drops oldest

* Setup: generate 1005 output entries quickly in one tab
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
* Trigger command `pick` and arrow-select the B suggestion.
* Trigger `pick` again without changing the default suggestion.
* Assert the second run resolves to B.
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

* Start USER_SCRIPT command that defines MAIN function and calls it.
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

## 5) Planned dev harness (A1-A5)

### Purpose

The harness provides a deterministic way to:

* seed storage with known commands + aliases
* open a controlled test tab
* trigger invocations (without omnibox UI)
* read session logs + minimal invocation state for assertions

This is for developer testing only. It should be disabled or guarded behind a “dev mode” flag in production builds if you care.

---

### 5.1 Harness page

#### 5.1.1 Location

An internal extension page, e.g.:

* `chrome-extension://<id>/harness.html`

It provides simple controls:

* “Reset storage”
* “Install fixtures”
* “Open test tab”
* “Run test case A1…A5”
* “Show logs”
* “Show active invocations”

#### 5.1.2 Harness responsibilities

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

### 5.2 Minimal SW hooks (dev-only API)

#### 5.2.1 Hook design goals

* Must not change production behavior.
* Must not expose sensitive data by default.
* Must be easy to disable.

#### 5.2.2 Enablement

One of:

* `DEV_MODE` build flag (recommended)
* or a setting in `chrome.storage.local` like `fcmd:devmode=true` that is only set locally

All harness-only message handlers should require dev mode enabled.

---

### 5.3 Harness to SW message API

All harness messages use:

* `type: "fcmd_harness"`
* `op: ...`
* `requestId` for correlation

#### 5.3.1 Start invocation (bypass omnibox)

**Request**

```json
{
  "type": "fcmd_harness",
  "op": "START",
  "requestId": "…",
  "tabId": 123,
  "input": "pick@fixture.B --force sample"
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

#### 5.3.2 Get logs

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

#### 5.3.3 Clear logs

**Request**

```json
{ "type": "fcmd_harness", "op": "CLEAR_LOGS", "requestId": "…" }
```

**Response**: ok

#### 5.3.4 Get invocation state (minimal)

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
      "name": "pick",
      "id": "fixture.B",
      "status": "RUNNING" | "DONE" | "ERROR" | "CANCELED",
      "startedAt": 1760000000000
    }
  }
}
```

Notes:

* Minimal info only; no code contents or secrets.
* Enough for harness assertions.

#### 5.3.5 Cancel invocation

**Request**

```json
{ "type": "fcmd_harness", "op": "CANCEL", "requestId": "…", "invocationId": "…" }
```

**Response**: ok (even if already ended)

---

### 5.4 Fixture installation strategy

#### 5.4.1 Install fixtures button

The harness page writes a known set of commands:

* two commands with same `name` different `id` (for MRU tests)
* a command with invalid requires URL (for requires failure)
* a command that uses `ctx.main.define/call` (for bridge)
* a command that calls denylisted namespace (for `UNSUPPORTED_MEMBER`)
* a long-running cancellable command (for cancel-on-navigation)

It also installs:

* one alias mapping that points to a fully-qualified token

#### 5.4.2 Reset storage

Reset should:

* remove all keys starting with `fcmd:`
* then install fixtures fresh

---

### 5.5 Recommended harness assertions (A1-A5)

#### A1: Resolution + MRU

* Start `pick` and choose B from the omnibox suggestions.
* Start `pick` again without changing the default suggestion.
* Assert the second run chose B (by checking overlay log entries or invocation metadata).

#### A2: Cancel on navigation

* Start long-running command.
* Navigate tab via `chrome.tabs.update({url: ...})`.
* Assert invocation status becomes `CANCELED` and busy state clears.

#### A3: Requires failure log

* Start command with invalid require URL.
* Assert logs contain `REQUIRES_FAILED`.

#### A4: Bridge define/call

* Start bridge command.
* Assert logs contain expected returned value.

#### A5: Denylisted blocked

* Start command calling `chrome.management.*`.
* Assert error code `UNSUPPORTED_MEMBER` is logged.

---

### 5.6 Keeping harness from polluting production

* All harness op handlers should be behind dev mode.
* Consider naming these messages distinctly and rejecting them by default.
* Do not add any harness APIs that:

  * expose command code
  * allow arbitrary storage read/write (beyond fixture convenience)
  * allow arbitrary method execution bypassing the normal invocation pipeline

---
