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
