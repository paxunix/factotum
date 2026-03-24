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
  "world": "user_script",
  "code": "async function main(argvTokens, ctx) { return 42; }",
  "description": { "en-US": "Simple success fixture" },
  "createdAt": 1760100000000,
  "updatedAt": 1760100000000
}
```

## Runtime model

- Commands run tab-bound in `USER_SCRIPT`.
- `MAIN` is not a top-level command runtime; use `ctx.main.define()` and `ctx.main.call()` to cross into page context.
- One command runs at a time per tab.
- Commands are canceled on tab close and top-level navigation.

## `main(argvTokens, ctx)`

- `argvTokens`: positional/option tokens after the command token
- `ctx.signal.aborted`: cooperative cancel flag
- `ctx.main.define(name, fn)`: expose a named `MAIN` entrypoint for this invocation
- `ctx.main.call(name, args)`: call a named `MAIN` entrypoint for this invocation
- `ctx.out.write/info/warn/error(value)`: append user-visible output bubbles to the session console

Current status:
- `ctx.chrome` is still not implemented
- `ctx.log/warn/error` remain internal diagnostics, not the user-facing output API

## Output

Use `ctx.out.*` for user-visible output.

Examples:

```js
async function main(argvTokens, ctx) {
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

`f cmd --help`:
- skips normal command execution
- renders help in the session console
- may use generated `usage`, `options`, and `args` tokens from `optionsSpec`

## Requires

- sequential only
- side-effect only
- `data:` URLs are disallowed
- default require world is `MAIN`
- `world: "user_script"` is only for `kind: "module"` best-effort cases

Consult `FACTOTUM_V1_HANDOFF.md` before relying on require behavior details.

## Bridge

Pattern:

```js
async function main(argvTokens, ctx) {
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
