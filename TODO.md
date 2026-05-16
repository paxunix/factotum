# TODO.md — Deferred Work and Follow-Ups

Use this file to capture work that should not be forgotten but does not belong on the current critical path.
Items here may be bugs, UX polish, wishlist ideas, or later-milestone follow-ups.

## Rules
- Keep entries concise and actionable.
- Remove entries when they are completed.
- If an item changes active milestone direction, reflect that in `PLAN.md` and any authoritative docs as needed.
- Do not treat TODO items as spec changes unless the authoritative docs are updated too.

## Current TODOs

### Bugs
- Remove remaining dead compatibility paths and scratch fixtures that still mention `world: "main"` as a command runtime. Validation already rejects this, but cleanup should finish converging code examples on USER_SCRIPT plus explicit MAIN bridge access.

### Omnibox / UX
- Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
- Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
- If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.
- Manager import diagnostics should explicitly list newly imported commands, similar to how duplicate and quarantine messages are already shown.

### Session console redesign
- Keep `ctx.log/warn/error` as internal diagnostics only; do not alias them to `ctx.out.*`.
- Add stronger visual distinctions between `ctx.out` output bubble levels (`info`, `warn`, `error`).
- Add stronger visual distinctions between command-output bubbles and command-state/result bubbles (`done`, `error`, `canceled`, help, system notices).
- Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.

### Tooling / verification
- Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
