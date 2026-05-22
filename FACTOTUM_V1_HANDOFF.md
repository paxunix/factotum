# FACTOTUM_V1_HANDOFF.md — Factotum v1 Handoff (Authoritative)

This document is the authoritative v1 specification for the Factotum Chrome MV3 extension.
It consolidates: runtime semantics, protocols, storage schema, build approach, testing/harness, and fixtures.

---
## Related docs (when to consult)
- `AGENTS.md`: Mandatory guardrails for any automated change; consult before edits.
- `TEST.md`: Manual smoke suite + harness tests; consult when planning or verifying changes.
- `DEVELOPING.md`: RPC exposure guidance and troubleshooting; consult when touching `ctx.chrome` or RPC plumbing.
- `fixture-pack.md`: Fixture bundle definition; consult when adding/importing test fixtures.
- `USER_GUIDE.md`: end-user usage guide.
- `FCMD_AUTHORING.md`: author-facing guide for writing fcommands.

When user-facing behavior or author-facing APIs change, keep those audience guides aligned with this authoritative document during the same checkpoint.

---

## 0) Goals and non-goals

### Goals
- Omnibox keyword provides a CLI-like interface to run user-installed “Fcommands”.
- Fcommand runtime runs tab-bound in USER_SCRIPT world.
- Privileged APIs (`chrome.*`) are available to commands via promise-based RPC (`ctx.chrome`).
- Commands may load dependencies via sequential `requires` (side-effect only).
- Commands can bridge between USER_SCRIPT and MAIN via named entrypoints (`ctx.main.define/call`).
- Minimal overlay UI (progress + cancel + status) always in ISOLATED.
- Session-only log viewer stores all logs (runtime and command) in one sink (max 1000 entries).

### Non-goals (v1)
- No re-entrancy (one invocation per tab).
- No background continuation beyond tab close/navigation.
- No event bridging or ports.
- No UI helper toolkit beyond overlay/progress/cancel.
- No persistent run history (logs are session-only).

### Current design direction

The current checked-in implementation now uses a per-tab session console as the command-facing overlay surface: it is lazy-created on first use in a tab, hidden when dismissed rather than destroyed, reopenable via omnibox `f -`, preserved across navigation in the same tab, and discarded on tab close. Saved command outcomes, help, system notices, active invocation state, and `ctx.out.write/info/warn/error` output all render in the same append-only bubble stream. Terminal states do not auto-dismiss, the desktop console defaults to a wider presentation, and the scrollback region is vertically resizable.

The main remaining follow-ups in this area are presentation refinements rather than a model change:

- stronger visual distinctions between output levels and command-state/system bubbles
- a cleaner generated-wrapper boundary before `main(argv, ctx)` so future `--debug` support has an obvious insertion point

---

## 1) Terminology

- Fcommand: user-installed command definition (metadata + JS).
- name: single token command word.
- id: canonical disambiguator.
- Fully-qualified token: `name@id` used internally when a selected omnibox suggestion must disambiguate a specific command.
- Alias: user-defined mapping from token → one or more `{name,id}` command refs (no args).
- SW: MV3 service worker.
- OR: overlay runner (ISOLATED, top frame).
- USR: command runtime executed via `chrome.userScripts` in USER_SCRIPT world.
- MH: MAIN bridge host (MAIN, top frame).
- Invocation: one command run, identified by `invocationId`.
- LocalizedText: map of BCP‑47 language tag → string, with `en-US` fallback.
- HelpTemplate: shared HTML template string with `{{token}}` placeholders.
- HelpStrings: map of BCP‑47 language tag → `{ token: string }` values for `HelpTemplate`.

---

## 2) Identifier constraints

### 2.1 Command name
- Regex: `^[A-Za-z0-9_-]+$`
- Case-sensitive (v1)

### 2.2 Command id
- Regex: `^[A-Za-z0-9._\\-/:]+$`
- Must not contain `@` or whitespace

### 2.3 Alias key
- Regex: `^[A-Za-z0-9_-]+$`
- Alias keys participate in omnibox candidate ranking and may point to one or more commands

### 2.4 Fully-qualified parsing
- Split on first `@` only.

---

## 3) Storage model (chrome.storage.local)

### Keys
- `fcmd:index` → lightweight metadata list + MRU fields
- `fcmd:aliases` → alias map
- `fcmd:cmd:<name>@<id>` → full command record

### Index record (schemaVersion 1)
`commands[]` entries contain: `{ name, id, version, description?, world, disabled?, mruAt?, updatedAt }`

### Command record (schemaVersion 1)
Fields:
- `schemaVersion: 1`
- `name`, `id`
- `version: string` (informational command revision; defaults to `"1"` when omitted)
- `world: "user_script"`
- `showOverlay?: boolean` (defaults to `true`; when `false`, normal execution/help/output stays hidden until explicitly reopened, but hard errors still force the session console visible)
- `disabled?: boolean` (default false; disabled commands are excluded from resolution)
- `code: string`
- `requires: RequireEntry[]` (optional)
- `optionsSpec?: OptionsSpec` (optional; used to generate help tokens and parse command options)
- `helpHtmlTemplate?: HelpTemplate` (raw HTML template)
- `helpHtmlStrings?: HelpStrings` (localized token values)
- `description?: LocalizedText`
- `createdAt`, `updatedAt` (epoch ms)

### 3.0a Invalid stored command handling

- A previously stored command record may become invalid after validation or allowed-value changes.
- Factotum must preserve the raw stored JSON for that record rather than silently deleting it.
- Invalid stored commands are quarantined:
  - excluded from normal resolution, invocation, and `commands[]` bundle export
  - surfaced in manager UI with validation details
  - exportable only via the separate `invalidCommands[]` recovery bucket in bundle JSON
- Re-importing an `invalidCommands[]` entry preserves the raw record in quarantined form; it remains ignored by normal runtime flows until repaired.

RequireEntry:
- `url: string` (https only; `data:` disallowed)
- `kind: "script" | "module"`
- `world?: "main" | "user_script"` (default main; user_script allowed only if kind=module)

Duplicates of `(name,id)` allowed; warn on import/install. UI may suffix duplicates for display.

Alias map:
- alias keys use the alias regex in §2.3
- each alias key maps to one or more command refs: `[{ name, id }, ...]`
- alias keys are user-managed shell-like shortcuts; they are not stored on command records
- exact alias execution selects the highest-MRU enabled command among the alias targets

OptionsSpec:
- `name?: string` (display name for usage; defaults to command name)
- `args?: string` (positional args usage string, e.g. `<input> [output]`; descriptive only)
- `options?: OptionSpec[]`

OptionSpec:
- `flags: string[]` (e.g., `["-f", "--force"]`)
- `value?: "string" | "number" | "boolean"`
- `description?: LocalizedText`
- `required?: boolean`
- `default?: string | number | boolean`

`OptionsSpec` is the author-facing option contract. Parser libraries used by the runtime are implementation details; commands must rely only on the normalized `argv` object described in §4.1.

### 3.1 Localization data model (command‑authored)

`LocalizedText` is a plain object whose keys are BCP‑47 language tags and whose values are strings.
Example:

```json
{
  "en-US": "Clean bookmarks",
  "fr": "Nettoyer les favoris"
}
```

Resolution order (case‑insensitive tag match):

1) Exact match (e.g., `fr-CA`)
2) Primary language fallback (e.g., `fr`)
3) `en-US`
4) First available key (stable iteration order)

If `description` is a string, it is treated as `en-US`.

### 3.2 Help HTML templating (recommended)

Commands should use a shared HTML template plus localized token values:

- `helpHtmlTemplate`: HTML string with `{{token}}` placeholders.
- `helpHtmlStrings`: map of locale → `{ token: string }`.

Example:

```json
{
  "helpHtmlTemplate": "<h1>{{title}}</h1><section><h2>{{usageTitle}}</h2><pre>{{usage}}</pre></section>",
  "helpHtmlStrings": {
    "en-US": { "title": "Pick", "usageTitle": "Usage", "usage": "pick [--flag] <arg>" },
    "fr": { "title": "Choisir", "usageTitle": "Utilisation", "usage": "pick [--flag] <arg>" }
  }
}
```

Example command record (excerpt):

```json
{
  "schemaVersion": 1,
  "name": "pick",
  "id": "demo.pick",
  "version": "1",
  "world": "user_script",
  "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{summary}}</p><section><h2>{{usageTitle}}</h2><pre>{{usage}}</pre></section>",
  "helpHtmlStrings": {
    "en-US": { "title": "Pick", "summary": "Selects an item.", "usageTitle": "Usage" },
    "fr": { "title": "Choisir", "summary": "Sélectionne un élément.", "usageTitle": "Utilisation" }
  },
  "description": { "en-US": "Pick an item", "fr": "Choisir un élément" }
}
```

Resolution order for `helpHtmlStrings` is the same as `LocalizedText` (§3.1).

Commands may generate some tokens at runtime (e.g., `usage` from an options spec) and merge them with localized author‑provided tokens before rendering.

### 3.3 Help rendering algorithm (required)

When `--help` is invoked:

1) Select a locale for the UI (use `navigator.language` or equivalent).
2) Resolve `helpHtmlStrings` for that locale using the same fallback order as `LocalizedText` (§3.1).
3) Build a token map:
   - Start with the resolved locale token map (author‑provided).
   - Overlay runtime‑generated tokens (e.g., `usage`, `options`, `args`) so generated content wins when provided.
4) Render `helpHtmlTemplate` by replacing `{{token}}` placeholders with the final token values.
5) Display the rendered HTML as‑is (raw HTML, no sanitization).

Recommended default tokens for consistency (not required):

- `title`
- `synopsis`
- `usage`
- `options`
- `args`
- `examples`

Commands that want automated help generation should provide an options spec and rely on the runtime to supply `usage/options/args` tokens, while author‑provided localized tokens cover the remaining content.

### 3.4 Options spec → help tokens (recommended)

If `optionsSpec` is present, the runtime should generate the following tokens (when not already supplied):

- `usage`: command name + option synopsis + args (e.g., `pick [--force] <input>`)
- `options`: HTML fragment listing flags and descriptions
- `args`: HTML fragment for positional args, if `args` is provided

If authors provide localized `description` for options, those should be used when generating the `options` token.

---

## 4) Omnibox parsing and resolution

### 4.1 Tokenization + option parsing
- Tokenize input using POSIX sh-like rules (`shell-quote`).
- Parse flags internally using `optionsSpec` as the author-facing contract.
- The parser must support short/long flags, aliases declared by multiple `flags`, `--` end-of-options, and `--flag=value`.
- When `optionsSpec.options` declares a closed option set, unknown flags fail before command execution.
- Required options fail before command execution when missing.
- `optionsSpec.args` is help/usage text only; it does not bind names to positional arguments or validate positional arity.
- Pass to command:
  - `argv.tokens`: raw tokens after the command token
  - `argv.positionals`: parsed positional arguments
  - `argv.options`: canonical option values keyed by the preferred option name

### 4.2 Resolution algorithm
1) cmdToken = first token; argvTokens = rest
2) Omit commands with `disabled: true` from all candidate generation.
3) Build a candidate set from enabled commands whose `name` or any alias key starts with `cmdToken`, using case-insensitive comparison.
4) Rank candidates by:
   - exact full `name` match
   - exact full alias match
   - prefix-of-`name` match
   - prefix-of-alias match
   - MRU-first within the same rank bucket
5) The first ranked candidate is the default command that runs if the user presses Enter without arrow-selecting another suggestion.
6) If the user arrow-selects another suggestion, that exact suggestion target runs with the same trailing args.
7) A selected suggestion may submit an internal fully-qualified token (`name@id`) so the chosen command remains deterministic even when multiple commands share the same name.
8) If no match:
   - show omnibox suggestion “No such command: …”
   - on execute: overlay error

### 4.2a Omnibox suggestion UX
- `onInputStarted` may preload command index and alias data for the current omnibox session.
- `onInputChanged` may present executable suggestions derived from the current input.
- Suggestions may include:
  - the exact command that would run if Enter is pressed immediately
  - whether the candidate came from exact name, exact alias, name prefix, or alias prefix matching
  - localized command description text
  - additional command-name and alias-prefix matches beyond the default first suggestion
  - a `--help` suggestion for a resolved command
- Prefix suggestions participate directly in execution semantics through the default selected suggestion.
- No fuzzy matching, typo correction, or semantic alternates in v1.
- Disabled commands are omitted from suggestions and invocation.

### 4.3 MRU update
- MRU updates on invocation start (regardless of success/failure), consistent with shell history.
- MRU stored in `fcmd:index` entry for that `(name,id)`.

### 4.4 Disabled commands
- Commands marked `disabled: true` are excluded from omnibox resolution.
- Disabled status does not delete data; it only prevents invocation.

---

## 5) Execution lifecycle

### 5.1 Constraints
- Tab-bound: unsupported to continue after spawning tab closes/navigates.
- Non-reentrant: one invocation per tab.
- Top-frame only.
- Hard error if tab is non-injectable. No RPC-only fallback.
- Command runtime executes in USER_SCRIPT world.
- MAIN is accessed through the explicit bridge (`ctx.main`), not as a symmetric top-level command runtime.

### 5.2 Start sequence
1) Resolve command.
2) If tab not injectable: hard error “Cannot run on this page.”
3) If tab busy: refuse with overlay message “busy”.
4) Create invocation: `invocationId`, per-invocation `nonce`.
5) Update MRU immediately.
6) Inject OR (ISOLATED overlay) in top frame.
7) Ensure MH exists in top frame MAIN when bridge support is needed.
8) Execute command code in USER_SCRIPT world using `chrome.userScripts.execute()` targeted to the top frame.
9) Load requires sequentially (side-effect only).
10) Execute `await main(argv, ctx)`.

### 5.3 End conditions
Invocation ends when:
- main resolves (DONE)
- main rejects/throws (ERROR)
- cancel occurs (CANCELED)
- injection/require/bridge failure occurs (ERROR)

After end:
- reject further RPC for invocationId
- tear down MH handlers
- remove overlay
- clear busy state

### 5.4 No timeouts
If main never settles, overlay stays “Running” indefinitely; cancel remains available; navigation cancels.

---

## 6) Cancellation

Cancel triggers:
- overlay cancel button
- tab close
- top-level navigation commit to new document

Cancel is cooperative:
- set `ctx.signal.aborted = true` (AbortSignal-like)
- SW rejects future RPC for invocationId with `CANCELED`
- helpers stop promptly
- arbitrary JS cannot be forcibly interrupted; commands should check `ctx.signal.aborted`

---

## 7) Requires loader (dependencies)

- Sequential only; strict order.
- Side-effect only (no handles returned).
- `data:` disallowed.
- Default require world: MAIN, regardless of command world.
- `world:"user_script"` only permitted for `kind:"module"` (best-effort).

Loading rules:
- MAIN script: inject `<script src=...>` await onload/onerror.
- MAIN module: MH performs `await import(url)`.
- USER_SCRIPT module (best-effort): execute `await import(url)` inside the user-script world; fail clearly if blocked.

Any require failure aborts invocation (ERROR) and is logged.

---

## 8) MAIN bridging (Option C)

Expose to commands:
- `await ctx.main.define(name: string, fn: Function)`
- `await ctx.main.call(name: string, args?: any[]): Promise<any>`
Optional: `undef`, `list`.

Mechanism:
- MH injected in MAIN top frame.
- Communication via `window.postMessage` using:
  - `invocationId`
  - per-invocation `nonce`
  - `callId` for correlation
- MH maintains per-invocation handler map `{name -> function}`.
- MH replies `{ok,result}` or `{ok:false,error}`.

Bridge may fail on restrictive pages (CSP/Trusted Types); failure is surfaced and logged.

---

## 9) Privileged APIs via RPC (`ctx.chrome`)

### 9.1 Author-facing
`ctx.chrome` is a Proxy mapping `ctx.chrome.ns.method(...args)` → SW RPC `method = "ns.method"` with Promise result.

### 9.2 Exposure policy
Expose all callable one-shot RPC-friendly methods EXCEPT:
- denylisted namespaces: `chrome.debugger`, `chrome.management`
- events (addListener/removeListener/hasListener)
- ports / long-lived channels (connect/connectNative etc.)
- non-cloneable results

### 9.3 Promisification
SW promisifies callback-style APIs using `chrome.runtime.lastError`.
For callback-style methods that directly return `undefined`, SW must wait for the callback result rather than treating the `undefined` return value as immediate success.

### 9.4 Invocation binding
SW rejects RPC if:
- invocationId unknown (`INVALID_INVOCATION`)
- tabId mismatch
- invocation ended/canceled (`CANCELED`)

---

## 10) Overlay UI / Session Console

- Always in ISOLATED top frame (shadow DOM).
- The command-facing UI is a per-tab session console overlay.
- It shows append-only bubbles for command start/progress, `ctx.out.*` output, help, and terminal states such as done/error/canceled/busy/no-such-command.
- Commands may opt out of automatic session-console visibility with `showOverlay: false`; the same session entries are still recorded and become visible when the user reopens the console with `f -`.
- `--help` shows raw rendered help HTML inline in the session console, skips requires and main execution, and requires explicit user dismissal.
- Help HTML is rendered from `helpHtmlTemplate` + localized `helpHtmlStrings` per §3.2.
- `f -` reopens the hidden session console for the current tab without starting a command.
- Hard execution errors still force the session console visible even when `showOverlay: false`.
- The desktop console uses a wider default presentation and a vertically resizable scrollback region.

---

## 11) Command output vs diagnostics

Commands get two different channels:

- `ctx.out.write`, `ctx.out.info`, `ctx.out.warn`, `ctx.out.error`
- `ctx.log`, `ctx.warn`, `ctx.error`

Command-facing output:
- `ctx.out.*` writes append-only entries into the per-tab session console.
- This is the API authors should use for anything the user should see.
- `ctx.out.write(...)` and `ctx.out.info(...)` currently behave the same way and both write `info`-level output entries; `write` is the preferred default for ordinary output.
- Output may be a plain value or a localized payload such as `{ l10n: LocalizedText, data?: any }`.
- Values are serialized safely for display; circular references are replaced, and Error objects retain name/message/stack/code fields when serialized.

Diagnostics:
- `ctx.log/warn/error` are internal diagnostics only and are not aliases of `ctx.out.*`.
- In the current implementation they write to the relevant DevTools console with a `[factotum command]` prefix.
- They do not appear in the per-tab session console.

---

## 12) Import/export

Bundle format:
```json
{
  "bundleSchemaVersion": 1,
  "exportedAt": 1760000000000,
  "commands": [ ... ],
  "invalidCommands": [ ... ],
  "aliases": {
    "cmd1": [{ "name": "pick", "id": "fixture.B" }]
  }
}
````

Import:

* Reject if bundleSchemaVersion != 1 (no auto migration)
* Duplicate `(name,id)` allowed + warn
* Alias collisions default: skip + warn (unless UI chooses overwrite)
* `commands[]` contains only valid commands that conform to the v1 schema
* `invalidCommands[]` is optional and preserves quarantined raw command records plus validation details for recovery/export; these entries are stored but ignored by normal runtime flows

Localization:

* `description` may be `LocalizedText`.
* `helpHtmlTemplate` + `helpHtmlStrings` may be present for templated help HTML.
* Export preserves localization data as-is.
* `optionsSpec` may be present; export preserves it as-is.

---

## 13) Permissions baseline (permissive)

* Host permissions: `<all_urls>`
* Broad extension permissions to support wide `chrome.*` availability.
* Exclusions: do not request or expose `chrome.debugger` and `chrome.management` (denylist).

---

## 14) Build approach (plain JS, no framework)

* Plain JS + HTML + CSS
* Multi-page UI is allowed
* Tiny build: esbuild bundles JS dependencies into `dist/`
* Copy static HTML/CSS/assets to `dist/` without bundling
* No hot reload required
* UI strings must use extension localization (`_locales`) via `chrome.i18n.getMessage`, with `en-US` fallback.
* `manifest.json` must set `default_locale` when `_locales/` is present; UI strings live in `_locales/<locale>/messages.json`.
* Manifest/CSS may reference localized strings via `__MSG_key__` as supported by Chrome.
* Dates and other localizable data in UI should use `Intl` with UI language preference.

Recommended entrypoints:

* SW: `src/sw/sw.js` → `dist/sw/sw.js`
* Injected: `overlay.js`, `main_host.js`
* User-script execution: command code dispatched via `chrome.userScripts.execute()` in USER_SCRIPT world
* UI pages: `manager.js` (CodeMirror bundled for command code and help-template editing) and `popup.js`

UI access:

* Provide a full-size manager/editor UI via extension pages (recommended for editing code/help).
* Popup (browser action) acts as a lightweight launcher for the manager page.

---

## 15) Protocol constants

Control ops (SW → runners):

* INIT_OVERLAY
* SET_STATUS
* CANCEL
* TEARDOWN

Overlay states:

* RUNNING
* DONE
* ERROR
* CANCELED
* BUSY
* HELP

Message types:

* fcmd_control
* fcmd_rpc
* fcmd_rpc_result
* fcmd_log

MAIN bridge ops (postMessage):

* DEFINE
* CALL
* UNDEF (optional)
* LIST (optional)
* IMPORT
* SCRIPT_LOAD
* PING (optional)

Error codes:

* NO_SUCH_COMMAND
* CANNOT_INJECT
* TAB_BUSY
* CANCELED
* INVALID_INVOCATION
* NO_SUCH_METHOD
* UNSUPPORTED_MEMBER
* UNSUPPORTED_API_SHAPE
* UNCLONEABLE_RESULT
* REQUIRES_FAILED
* BRIDGE_FAILED
* RPC_FAILED

---

## 16) Test plan (manual + harness)

### Manual smoke suite (must-pass)

Covers:

* ranked exact/prefix name and alias matching, MRU tie-breaking, and no-such-command behavior
* non-injectable page hard error
* overlay appears and status transitions
* cancel button, cancel-on-navigation, cancel-on-tab-close
* requires sequential ordering, data: rejection, MAIN import, USER_SCRIPT import best-effort
* bridge define/call and nonce spoof prevention
* RPC: basic calls, denylist block, event block, clone failures
* logging: order, delete entry, clear all, cap 1000 drops oldest

### Harness automation (A1–A5)

Harness page `harness.html`:

* installs fixtures by importing bundle
* opens test tab
* triggers invocations via SW dev hook START (bypassing omnibox UI)
* queries session logs and minimal invocation state via GET_LOGS / GET_STATE

---

## 17) Harness API (dev-only)

Messages:

* START {tabId, input} → returns invocationId
* GET_LOGS
* CLEAR_LOGS
* GET_STATE (minimal invocation map)
* CANCEL {invocationId}

Dev-mode gating required.

---

## 18) Fixture pack (bundleSchemaVersion 1)

Use a normal import bundle named `fixtures-v1.json` with:

* [pick@fixture.A](mailto:pick@fixture.A) and [pick@fixture.B](mailto:pick@fixture.B) (MRU tests)
* alias `cmd1` targeting one or more commands for alias-resolution tests
* [longrun@fixture.cancel.nav](mailto:longrun@fixture.cancel.nav) (cancel tests)
* [badreq@fixture.requires.fail](mailto:badreq@fixture.requires.fail) (external requires failure)
* [reqorder@fixture.requires.order](mailto:reqorder@fixture.requires.order) (sequential MAIN script requires)
* [reqdata@fixture.requires.data](mailto:reqdata@fixture.requires.data) (`data:` require rejection)
* [reqmod@fixture.requires.main.module](mailto:reqmod@fixture.requires.main.module) (MAIN module require)
* [requsermod@fixture.requires.user.module.fail](mailto:requsermod@fixture.requires.user.module.fail) (USER_SCRIPT module require failure)
* [bridge@fixture.main.bridge](mailto:bridge@fixture.main.bridge) (bridge test)
* [deny@fixture.denylisted](mailto:deny@fixture.denylisted) (denylisted namespace call)
* [events@fixture.events.unsupported](mailto:events@fixture.events.unsupported) (event usage rejection)
* [clonefail@fixture.rpc.uncloneable](mailto:clonefail@fixture.rpc.uncloneable) (maintained UNCLONEABLE_RESULT check via a narrow test-only RPC override)

Fixture maintenance requirements:

* fixture examples must remain importable under the current command schema
* fixture command records must use the currently valid command `world`
* fixture code samples must match the current runtime entrypoint contract (`async function main(...)`, not stale wrapper syntax)

See `fixture-pack.md` for the maintained canonical fixture pack and ad hoc manual smoke fixtures.

---

## 19) Drift prevention rules (hard requirements)

1. All cross-context messages include invocationId.
2. MAIN bridge messages must include invocationId + nonce.
3. Fatal wrapper failures must produce at least one error log entry in the single sink.
4. MRU updates on invocation start only.
5. Requires are sequential and side-effect-only.
6. Overlay always in ISOLATED top frame.
7. Command runtime lives in USER_SCRIPT; MAIN is entered only through the bridge.
8. No events/ports; denylist debugger/management namespaces.

---
