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
- Allow omnibox execution from unique prefixes of command names and aliases, resolving the correct MRU command when a prefix is ambiguous but runnable by MRU.
- Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
- If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.

### Manager / editor UX
- Add command deletion. Prefer an undoable deletion flow; decide whether this means soft-delete until page close, a trash/undo queue, or another reversible model.
- Add alias management to the manager editor so users can add/remove every alternate invocation name for a command.
- Add help-template preview. Preferred direction: render preview through the same overlay UI used by command help, overlaying on the manager page and dismissible by the user.
- Replace JSON textareas with friendlier structured editors over time for localized descriptions, help strings, optionsSpec, and requires. For localized text, prefer a locale selector plus add-locale flow over raw JSON editing.
- Present `world` with an appropriate Web Awesome fixed-choice control instead of a free-text/read-only string once world editing/new-command flow exists.
- Add ACE for the command code editor as a separate checkpoint from the structural manager layout pivot.
- fix editor text area sizing and scrolling.  If you paste too many lines into it or load an fcommand whose code has many lines, the text area becomes too large and you can't scroll the rightmost panel to reach other content within it.
- manager UX needs a separate tab to hold overall settings.
- Fcommands need metadata indicating the user's preference for whether the
  overlay should be shown for the command or not.  This lets a user/author
  have fcommand behaviour that has no Factotum UI.  All the same information
  would be recorded and logged as usual, only the overlay would not show
  like it usually does during command invocation, execution, and completion.
  This setting can be modified by the user by editing the fcommand.

### Overlay UX

- an additional settings toggle area at the bottom of the overlay that houses buttons for adjusting overlay settings.  The settings are persisted for the extension beyond current page and session..
    - setting for toggling whether the overlay is light or dark, probably based on the page on which the overlay is loaded.
    - setting for changing overlay opacity

### Session console redesign
- Auto-scroll the session console to the bottom after each new write only when the user is already at the bottom; if the scroll thumb is away from the end, preserve the user's scroll position so history inspection is not interrupted.
- Keep `ctx.log/warn/error` as internal diagnostics only; do not alias them to `ctx.out.*`.
- Add stronger visual distinctions between `ctx.out` output bubble levels (`info`, `warn`, `error`).
- Add stronger visual distinctions between command-output bubbles and command-state/result bubbles (`done`, `error`, `canceled`, help, system notices).
- Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.

### Tooling / verification
- Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
