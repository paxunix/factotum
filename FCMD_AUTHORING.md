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
- `ctx.signal.aborted`: cooperative cancel flag
- `ctx.main.define(name, fn)`: expose a named `MAIN` entrypoint for this invocation
- `ctx.main.call(name, args)`: call a named `MAIN` entrypoint for this invocation
- `ctx.out.write/info/warn/error(value)`: append user-visible output bubbles to the session console
- `ctx.chrome.ns.method(...args)`: Promise-based access to the supported one-shot `chrome.*` surface

Current status:
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

Examples:

```js
async function main(argv, ctx) {
  ctx.out.write('a');
  ctx.out.write('b');
  ctx.out.info({
    l10n: { 'en-US': 'Hello', 'fr': 'Bonjour' },
    data: { n: 1 }
  });
}
```

Notes:
- output is appended in order
- localized payloads use the tab/page language
- previously written output remains as it was when emitted

## Help and options

Optional fields:
- `helpHtmlTemplate`
- `helpHtmlStrings`
- `optionsSpec`

`optionsSpec` is Factotum's author-facing option contract. Factotum may use parser libraries internally, but commands should depend only on the normalized `argv` object passed to `main()`.

Shape:

```json
{
  "name": "bookmark-find",
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

Positional behavior:
- `argv.positionals` is an ordered array.
- `optionsSpec.args` is usage/help text only.
- Factotum does not bind positional names, validate positional arity, or create named positional properties.
- If `args` is `<verb> <object>`, the command must read `argv.positionals[0]` and `argv.positionals[1]` itself.

`f cmd --help`:
- skips normal command execution
- renders help in the session console
- may use generated `usage`, `options`, and `args` tokens from `optionsSpec`
- uses `optionsSpec` to parse command input before `main()` runs; unknown flags and missing required options fail before command execution when an option set is declared

## Requires

- sequential only
- side-effect only
- `data:` URLs are disallowed
- default require world is `MAIN`
- `kind: "script"` loads a classic MAIN `<script src="...">`
- `kind: "module"` loads a MAIN module with dynamic `import(url)` unless `world: "user_script"` is set
- `world: "user_script"` is only for `kind: "module"` best-effort cases

Require examples:

```json
{ "url": "https://example.com/legacy-lib.js", "kind": "script" }
```

Loads a classic script in MAIN.

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
