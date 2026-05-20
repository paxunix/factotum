# Factotum Example Fcommands

These examples are importable bundles intended for authors to study and users to run.

Each `*.json` file can be imported from the Manager Utilities tab. Examples are working fcommands, not smoke-test fixtures.

## `bookmarks-url-find-delete.json`

Command: `bookmarks-url`

Alias: `bmurl`

Finds bookmarks whose URLs contain any supplied substring, using `ctx.chrome.bookmarks` from the `USER_SCRIPT` runtime. Matching is case-insensitive.

Usage:

```text
f bookmarks-url [--delete | -d] <word...>
```

Run without `--delete` first to preview the matched bookmark titles and URLs. Rerun with `--delete` or `-d` to remove the same matching set.

What authors should understand:

- Keep privileged Chrome API work in the normal `USER_SCRIPT` runtime.
- Use `ctx.chrome.*` as Promise-based APIs; do not pass Chrome callback arguments.
- Declare option aliases in `optionsSpec`, then read the canonical value from `argv.options`.
- Use `argv.positionals` for already-tokenized and parsed positional input.
- Prefer preview-before-delete flows for destructive commands.

## `bookmarks-url-dialog-delete.json`

Command: `bookmarks-dialog`

Alias: `bmdel`

Finds bookmarks whose URLs contain any supplied substring, then opens a plain DOM modal in the current page with one checkbox per matched bookmark. The modal UI is isolated in a shadow root so page CSS cannot hide or restyle its controls. The command queries and deletes bookmarks from `USER_SCRIPT` through `ctx.chrome.bookmarks`; the modal UI runs in `MAIN` through `ctx.main.define()` and `ctx.main.call()`.

Usage:

```text
f bookmarks-dialog <word...>
```

Matches are unchecked by default. Use the modal's All or None buttons to adjust selection, then Delete selected to remove only checked bookmarks or Cancel to make no changes.

What authors should understand:

- Split responsibilities by world: `USER_SCRIPT` owns privileged `chrome.*` calls, while `MAIN` owns page DOM UI.
- Pass cloneable data across the MAIN bridge; do not pass DOM nodes, functions, or Chrome API handles.
- Use `ctx.main.define()` for the page-context entrypoint and `ctx.main.call()` to await the user's UI decision.
- Return selected IDs or other simple data from MAIN, then perform privileged mutations back in `USER_SCRIPT`.
- Keep MAIN-created UI self-cleaning so a canceled command leaves the page usable.

## `window-functions-panel.json`

Command: `windowfuncs`

Alias: `wfuncs`

Runs page-context work in `MAIN` through `ctx.main.define()` and `ctx.main.call()`. It inspects enumerable properties on the page's `window` object, finds values whose type is `function`, and appends a dismissible panel to the page listing those function names.

Usage:

```text
f windowfuncs
```

Use this as the minimal pattern for fcommands that need page globals or page DOM side effects but do not need privileged `chrome.*` APIs.

What authors should understand:

- Command records still use `world: "user_script"`; page-context behavior is reached through the explicit MAIN bridge.
- Use MAIN when the command needs page globals such as `window` or needs to mutate the page DOM.
- Keep the USER_SCRIPT side thin when no privileged APIs are needed: define the MAIN entrypoint, call it, and report the result.
- Inspecting page objects can throw for some properties, so page-context code should tolerate per-property failures.
