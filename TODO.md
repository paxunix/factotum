# TODO.md — Deferred Work and Follow-Ups

Use this file to capture work that should not be forgotten but does not belong on the current critical path.
Items here may be bugs, UX polish, wishlist ideas, or later-milestone follow-ups.

## Rules
- Keep entries concise and actionable.
- Entries should be numbered.  No requirement the numbers remain monotonically increasing from entry to entry.
- Remove entries when they are completed.
- If an item changes active milestone direction, reflect that in `PLAN.md` and any authoritative docs as needed.
- Do not treat TODO items as spec changes unless the authoritative docs are updated too.

## Current TODOs

### Bugs
1. Remove remaining dead compatibility paths and scratch fixtures that still mention `world: "main"` as a command runtime. Validation already rejects this, but cleanup should finish converging code examples on USER_SCRIPT plus explicit MAIN bridge access.

### Omnibox / UX
1. Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
2. Allow omnibox execution from unique prefixes of command names and aliases, resolving the correct MRU command when a prefix is ambiguous but runnable by MRU.
3. Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
4. If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.

### Manager / editor UX
1. Add command deletion. Prefer an undoable deletion flow; decide whether this means soft-delete until page close, a trash/undo queue, or another reversible model.
2. Add alias management to the manager editor so users can add/remove every alternate invocation name for a command.
3. Add help-template preview. Preferred direction: render preview through the same overlay UI used by command help, overlaying on the manager page and dismissible by the user.
4. Replace JSON textareas with friendlier structured editors over time for localized descriptions, help strings, optionsSpec, and requires. For localized text, prefer a locale selector plus add-locale flow over raw JSON editing.
5. Present `world` with an appropriate Web Awesome fixed-choice control instead of a free-text/read-only string once world editing/new-command flow exists.
6. Add ACE for the command code editor as a separate checkpoint from the structural manager layout pivot.
7. fix editor text area sizing and scrolling.  If you paste too many lines into it or load an fcommand whose code has many lines, the text area becomes too large and you can't scroll the rightmost panel to reach other content within it.
8. manager UX needs a separate tab to hold overall settings.
9. Fcommands need metadata indicating the user's preference for whether the overlay should be shown for the command or not.  This lets a user/author have fcommand behaviour that has no Factotum UI.  All the same information would be recorded and logged as usual, only the overlay would not show like it usually does during command invocation, execution, and completion. This setting can be modified by the user by editing the fcommand.
10. the Installed Commands panel needs its command-list tab-group to be vertically scrollable so it always fits on the visible page, but you can still scroll to see every installed command

### Overlay UX

1. an additional settings toggle area at the bottom of the overlay that houses buttons for adjusting overlay settings.  The settings are persisted for the extension beyond current page and session..
    - setting for toggling whether the overlay is light or dark, probably based on the page on which the overlay is loaded.
    - setting for changing overlay opacity

### Session console redesign
1. Auto-scroll the session console to the bottom after each new write only when the user is already at the bottom; if the scroll thumb is away from the end, preserve the user's scroll position so history inspection is not interrupted.
2. Keep `ctx.log/warn/error` as internal diagnostics only; do not alias them to `ctx.out.*`.
3. Add stronger visual distinctions between `ctx.out` output bubble levels (`info`, `warn`, `error`).
4. Add stronger visual distinctions between command-output bubbles and command-state/result bubbles (`done`, `error`, `canceled`, help, system notices).
5. Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.

### Tooling / verification
1. Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
