# TODO.md — Deferred Work and Follow-Ups

Use this file to capture work that should not be forgotten but does not belong on the current critical path.
Items here may be bugs, UX polish, wishlist ideas, or later-mileestone follow-ups.

## Rules
- Keep entries concise and actionable.
- Remove entries when they are completed.
- If an item changes active milestone direction, reflect that in `PLAN.md` and any authoritative docs as needed.
- Do not treat TODO items as spec changes unless the authoritative docs are updated too.

## Current TODOs

### Bugs
- Omnibox prefix suggestions currently collapse commands that share the same `name`; if more than one command matches a typed prefix, only one appears in the suggestion list.

### Omnibox / UX
- Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
- Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.

### M2 follow-up
- Implement overlay/error feedback so `NO_SUCH_COMMAND`, busy-tab, and successful invocation states are visible outside the service worker console.

### M4 follow-up
- Add real `helpHtmlTemplate`/`optionsSpec` fixtures so the `--help` omnibox suggestion path can be exercised end to end.

### Tooling / verification
- Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
