# FCMD_AUTHORING.md — Writing Fcommands

This guide is for people authoring Factotum commands ("fcommands").

## Related docs
- `FACTOTUM_V1_HANDOFF.md`: authoritative behavior and schema
- `DEVELOPING.md`: implementation/debugging notes for bridge, requires, and RPC
- `fixture-pack.md`: maintained smoke fixtures
- `TEST.md`: manual tests that exercise author-visible behavior

## Minimal command

An fcommand record must use `world: "user_script"` and define an async `main()` function:

```json
{
  "schemaVersion": 1,
  "name": "ok",
  "id": "demo.ok",
  "version": "1",
  "world": "user_script",
  "code": "async function main(argv, ctx) { return 42; }",
  "description": { "en-US": "Simple success fixture" },
  "createdAt": 1760100000000,
  "updatedAt": 1760100000000
}
```

Aliases are not part of the command record schema. Users assign aliases separately in the Manager UI, and the extension stores them in the global alias map.

From an author's perspective, this means command discovery in the omnibox is driven by:
- command names
- user-defined aliases for those commands
- case-insensitive prefix matching across both

`version` is optional informational metadata for the command itself. Factotum defaults it to `"1"` when it is omitted and does not currently assign any runtime semantics to it.
`showOverlay` is optional command metadata controlling whether normal command execution auto-shows the session console. It defaults to `true`. When set to `false`, normal running/output/completion/help stays hidden until the user explicitly reopens the tab's session console with `f -`, but hard execution errors still force it visible.

## Runtime model

- Commands run tab-bound in `USER_SCRIPT`.
- `MAIN` is not a top-level command runtime; use `ctx.main.define()` and `ctx.main.call()` to cross into page context.
- One command runs at a time per tab.
- Commands are canceled on tab close and top-level navigation.

## Worlds

Factotum uses two page worlds:

- `USER_SCRIPT`: the command runtime. Every fcommand record must use `world: "user_script"`, and `main(argv, ctx)` runs here.
- `MAIN`: the page's own JavaScript environment. Use it only when you need page-context side effects or access to page globals.

Most commands should stay in `USER_SCRIPT` and use the `ctx` APIs:

- use `ctx.chrome.*` for privileged extension APIs
- use `ctx.out.*` for user-visible output
- use `ctx.main.define/call` only for page-context work

Examples of MAIN work:

- reading or writing page globals
- calling a page-defined function
- loading a legacy script dependency that expects to attach itself to `window`

MAIN bridge functions are per invocation. Define the entrypoints you need inside the command before calling them:

```js
async function main(argv, ctx) {
  await ctx.main.define('readTitle', () => document.title);
  const title = await ctx.main.call('readTitle');
  ctx.out.write(title);
}
```

## `main(argv, ctx)`

- `argv.tokens`: raw positional/option tokens after the command token
- `argv.positionals`: parsed positional arguments
- `argv.options`: parsed options keyed by the canonical option name from `optionsSpec`
- `argv.disposition`: requested omnibox disposition, always present as `currentTab`, `newForegroundTab`, or `newBackgroundTab`
- `ctx.signal.aborted`: cooperative cancel flag
- `ctx.main.define(name, fn)`: expose a named `MAIN` entrypoint for this invocation
- `ctx.main.call(name, args)`: call a named `MAIN` entrypoint for this invocation
- `ctx.out.write/info/warn/error(value, options?)`: append user-visible output bubbles to the session console
- `ctx.help(value?, options?)`: optionally append a message bubble, then show the command's help and stop execution
- `ctx.chrome.ns.method(...args)`: Promise-based access to the supported one-shot `chrome.*` surface

- `ctx.chrome.ns.method(...args)` is available for the v1 one-shot Chrome API surface
- denylisted namespaces like `chrome.management` reject with `UNSUPPORTED_MEMBER`
- event/listener shapes reject with `UNSUPPORTED_API_SHAPE`
- `ctx.log/warn/error` remain internal diagnostics, not the user-facing output API

Important author rule:
- Always use `await ctx.chrome...` or the returned Promise directly.
- Do not pass Chrome-style callbacks to `ctx.chrome` methods from an fcommand.
- Factotum normalizes callback-style Chrome APIs into Promise results for you.

Example:

```js
async function main(argv, ctx) {
  const tabs = await ctx.chrome.tabs.query({ active: true, currentWindow: true });
  const bookmarks = await ctx.chrome.bookmarks.search({ title: document.title });
  ctx.out.write(`tabs=${tabs.length} bookmarks=${bookmarks.length}`);
}
```

## Output

Use `ctx.out.*` for user-visible output.

Current behavior:
- `ctx.out.write(value)` and `ctx.out.info(value)` currently behave the same way: both append an `info`-level output bubble to the session console.
- Prefer `ctx.out.write(...)` for ordinary command output.
- Use `ctx.out.warn(...)` and `ctx.out.error(...)` when the output should carry warning or error intent.
- `options` currently supports `{ pretty?: boolean }` for object-like output formatting.
- For objects, arrays, and normalized `Error` output, pretty-printing defaults to `true`.
- Use `{ pretty: false }` when you want compact one-line JSON instead.
- `ctx.help(value?, options?)` also accepts `{ level?: 'info' | 'warn' | 'error', pretty?: boolean }`; `level` defaults to `error`.

Examples:

```js
async function main(argv, ctx) {
  ctx.out.write('a');
  ctx.out.write('b');
  ctx.out.write({ nested: { ok: true }, values: [1, 2] });
  ctx.out.write({ nested: { ok: true }, values: [1, 2] }, { pretty: false });
  ctx.out.info({
    l10n: { 'en-US': 'Hello', 'fr': 'Bonjour' },
    data: { n: 1 }
  });
}
```

Notes:
- output is appended in order
- localized payloads use the browser UI language with `en-US` fallback
- previously written output remains as it was when emitted
- object-like output is pretty-printed by default
- pass `{ pretty: false }` as the optional second argument for compact JSON output
- a non-`undefined` value returned from `main(argv, ctx)` is shown in the terminal `Done` bubble using the same display formatting
- a thrown or rejected error is shown in the terminal `Error` bubble using normalized error details
- `ctx.help(...)` appends its optional message first, then terminates through the normal help bubble path instead of the error path

Typical `ctx.help(...)` usage:

```json
{
  "schemaVersion": 1,
  "name": "openitem",
  "id": "demo.openitem",
  "version": "1",
  "world": "user_script",
  "description": { "en-US": "Open an item by name" },
  "code": "async function main(argv, ctx) {\n  const [name] = argv.positionals;\n  if (!name) {\n    ctx.help('Missing required item name.', { level: 'error' });\n  }\n\n  ctx.out.write(`Opening ${name}`);\n}",
  "helpHtmlTemplate": "<h1>{{title}}</h1>{{summaryBlock}}<section><h2>{{usageTitle}}</h2><pre>{{usage}}</pre></section>{{argsBlock}}",
  "helpHtmlStrings": {
    "en-US": {
      "title": "openitem",
      "summary": "Open an item by name."
    }
  },
  "optionsSpec": {
    "args": "<name>"
  },
  "createdAt": 1760100000000,
  "updatedAt": 1760100000000
}
```

If the user runs `f openitem` without a name, the command writes the "Missing required item name." error bubble and then shows the command's rendered help. If the user runs `f openitem report`, execution continues normally.

Diagnostic logging is separate from user-visible output:
- use `ctx.out.write/info/warn/error(...)` when the user should see the message in the session console
- use `ctx.log/warn/error(...)` only for debugging
- today `ctx.log/warn/error(...)` go to the relevant DevTools console with a `[factotum command]` prefix and do not appear in the session console

## Help and options

Optional fields:
- `helpHtmlTemplate`
- `helpHtmlStrings`
- `optionsSpec`

`optionsSpec` is Factotum's author-facing option contract. Factotum may use parser libraries internally, but commands should depend only on the normalized `argv` object passed to `main()`.

Help-template token model:
- `helpHtmlTemplate` is an HTML string with `{{token}}` placeholders.
- `helpHtmlStrings` is the author-defined localized token map.
- Factotum resolves the locale-specific token object from `helpHtmlStrings`, then overlays a small runtime-generated token set before rendering.
- Today the runtime-generated tokens are `title`, `summary`, `summaryBlock`, `usageTitle`, `optionsTitle`, `argsTitle`, `usage`, `options`, `args`, `optionsBlock`, and `argsBlock`.
- Author-provided token values from `helpHtmlStrings` are treated as text and HTML-escaped before insertion.
- The generated `usage`, `title`, `summary`, and built-in heading tokens are inserted as escaped text.
- The generated `summaryBlock`, `options`, `args`, `optionsBlock`, and `argsBlock` tokens are inserted as runtime HTML fragments.
- `usage`, `options`, and `args` always come from runtime generation.
- For the other built-in tokens, author-provided values from `helpHtmlStrings` win when present; otherwise the runtime falls back to command metadata and extension-localized headings.
- If the template references a token that is not present after that merge, the placeholder renders as an empty string.
- The manager validates unresolved non-runtime tokens at save time and blocks the save with a per-locale error message so template mistakes are caught during authoring.
- Runtime help resolution uses the browser UI language with `en-US` fallback.
- The manager Help section also includes a Preview tab that renders the current unsaved help draft with the same template/token expansion logic used by runtime `--help`; the preview locale selector is an explicit authoring override for inspecting other locales.

Practical pattern:
- put author-owned text such as `title`, `summary`, `usageTitle`, `optionsTitle`, and `examplesTitle` in `helpHtmlStrings`
- rely on Factotum to generate `usage`, `options`, and `args` from `optionsSpec` when those sections are needed
- use `optionsBlock` and `argsBlock` when you want built-in section wrappers with headings; use `options` and `args` when your template wants to place those fragments itself
- if you omit both `helpHtmlTemplate` and `helpHtmlStrings`, Factotum falls back to a built-in help template that uses the command name, localized description, and built-in localized section headings

Shape:

```json
{
  "args": "<term> [more terms...]",
  "options": [
    {
      "flags": ["-d", "--delete"],
      "value": "boolean",
      "description": { "en-US": "Delete matching bookmarks" }
    }
  ]
}
```

Option behavior:
- `flags` may declare short and long aliases for the same option.
- The canonical key in `argv.options` is the first long flag without leading dashes, or the first flag when no long flag exists.
- Supported values are `boolean`, `string`, and `number`; omitted `value` means `boolean`.
- `default` supplies the option value when the option is not present.
- `required: true` fails before `main()` runs when the option is missing.
- When `options` declares an option set, unknown flags fail before `main()` runs.
- `--help` and `-h` are reserved for Factotum help handling.
- `--debug` is reserved for Factotum runtime debugging and pauses on a `debugger;` statement immediately before `main(argv, ctx)` runs when DevTools is open.

Positional behavior:
- `argv.positionals` is an ordered array.
- `optionsSpec.args` is usage/help text only.
- Factotum does not bind positional names, validate positional arity, or create named positional properties.
- If `args` is `<verb> <object>`, the command must read `argv.positionals[0]` and `argv.positionals[1]` itself.

Disposition behavior:
- `argv.disposition` tells the command how the user accepted the omnibox input.
- `currentTab` means use the current tab.
- `newForegroundTab` means the user requested a new selected tab.
- `newBackgroundTab` means the user requested a new background tab.
- Commands that open URLs should use this field to choose between `ctx.chrome.tabs.update(...)` and `ctx.chrome.tabs.create(...)`.
- Factotum always includes the field and defaults it to `currentTab` when there is no explicit new-tab request.

`f cmd --help`:
- skips normal command execution
- renders help in the session console
- resolves localized author tokens from `helpHtmlStrings`
- overlays or fills built-in runtime tokens from command metadata and `optionsSpec`
- renders any unknown `{{token}}` placeholder as an empty string
- uses `optionsSpec` to parse command input before `main()` runs; unknown flags and missing required options fail before command execution when an option set is declared

`f cmd --debug`:
- still runs the command normally
- inserts a `debugger;` stop immediately before `main(argv, ctx)` executes
- is useful only when DevTools is open for the page/user-script context

## Requires

- `requires[].world` applies to the dependency load target, not to the fcommand's own runtime world
- the fcommand itself still always runs in `USER_SCRIPT`
- sequential only
- side-effect only
- `data:` URLs are disallowed
- default require world is `MAIN`
- `kind: "script"` loads a classic MAIN `<script src="...">`
- `kind: "module"` loads a MAIN module with dynamic `import(url)` unless `world: "user_script"` is set
- `world: "user_script"` is only for `kind: "module"` best-effort cases

Why a `MAIN` require is useful even though the command itself runs in `USER_SCRIPT`:
- a MAIN-world dependency can patch `window`, install a page-global library, or otherwise affect the page's own JavaScript environment
- the fcommand then reaches that page-side state through `ctx.main.define()` and `ctx.main.call()`
- requires are still side-effect only; the command does not receive a direct module handle back from MAIN

Require examples:

```json
{ "url": "https://example.com/legacy-lib.js", "kind": "script" }
```

Loads a classic script in MAIN.

Typical usage pattern:

```js
async function main(argv, ctx) {
  await ctx.main.define('runPageLib', (input) => window.PageLib.doThing(input));
  const result = await ctx.main.call('runPageLib', ['hello']);
  ctx.out.write(result);
}
```

In that pattern:
- the require loaded `window.PageLib` into MAIN as a side effect
- the command stayed in `USER_SCRIPT`
- the bridge was used only to call into the page realm where the dependency actually lives

```json
{ "url": "https://example.com/mod.mjs", "kind": "module" }
```

Loads a module in MAIN.

```json
{ "url": "https://example.com/user-mod.mjs", "kind": "module", "world": "user_script" }
```

Attempts a USER_SCRIPT module import. This is best-effort and may fail because of CORS/CSP/import restrictions.

Consult `FACTOTUM_V1_HANDOFF.md` before relying on deeper require behavior details.

## Bridge

Pattern:

```js
async function main(argv, ctx) {
  await ctx.main.define('add', (a, b) => a + b);
  const sum = await ctx.main.call('add', [2, 3]);
  ctx.out.write(`sum=${sum}`);
}
```

## Testing

Recommended author smoke checks:
- normal success path
- `--help`
- cancel on a long-running command
- any `ctx.main` bridge behavior you depend on
- any `ctx.out.*` output ordering/localization you depend on

Use checked-in fixtures and `TEST.md` instead of ad hoc examples when possible.
