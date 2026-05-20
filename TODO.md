# TODO.md — Deferred Work and Follow-Ups

Use this file to capture work that should not be forgotten but does not belong on the current critical path.
Items here may be bugs, UX polish, wishlist ideas, or later-milestone follow-ups.

## Rules
- Keep entries concise and actionable.
- Entries should be prefix+numbered so it's clear what section they belong to and can be uniquely identified within this file.  No requirement the numbers remain monotonically increasing from entry to entry.
- Remove entries when they are completed.
- If an item changes active milestone direction, reflect that in `PLAN.md` and any authoritative docs as needed.
- Do not treat TODO items as spec changes unless the authoritative docs are updated too.

## Current TODOs

### Omnibox / UX
O1. Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
O2. Allow omnibox execution from unique prefixes of command names and aliases, resolving the correct MRU command when a prefix is ambiguous but runnable by MRU.
O3. Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
O4. If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.

### Manager / editor UX
M1. Add command deletion. Prefer an undoable deletion flow; decide whether this means soft-delete until page close, a trash/undo queue, or another reversible model.
M2. Add alias management to the manager editor so users can add/remove every alternate invocation name for a command.
M3. Add help-template preview. Preferred direction: render preview through the same overlay UI used by command help, overlaying on the manager page and dismissible by the user.
M4. Replace JSON textareas with friendlier structured editors over time for localized descriptions, help strings, optionsSpec, and requires. For localized text, prefer a locale selector plus add-locale flow over raw JSON editing.
M8. manager UX needs a separate tab to hold overall settings.
M9. Fcommands need metadata indicating the user's preference for whether the overlay should be shown for the command or not.  This lets a user/author have fcommand behaviour that has no Factotum UI.  All the same information would be recorded and logged as usual, only the overlay would not show like it usually does during command invocation, execution, and completion. This setting can be modified by the user by editing the fcommand.
M11. in Identity editor section, need to be able to edit the set of aliases for the fcommand
M17. ACE code editor should support user-specific configuration of its options (like paste in a JSON config blob that is passed to the ACE setup)
M18. when Code is selected in 2nd panel, focus should be moved to current cursor position in the editor.  This should also be done for each other editor control (if more than one, like for identiy, focus should be set to first control in the pane)
M19. disabled fcommands should be indicated differently in the command list (greyed out or some kind of visual distinction)


### Overlay UX

OU1. an additional settings toggle area at the bottom of the overlay that houses buttons for adjusting overlay settings.  The settings are persisted for the extension beyond current page and session..
    - setting for toggling whether the overlay is light or dark, probably based on the page on which the overlay is loaded.
    - setting for changing overlay opacity

### Session console redesign
SC1. Auto-scroll the session console to the bottom after each new write only when the user is already at the bottom; if the scroll thumb is away from the end, preserve the user's scroll position so history inspection is not interrupted.
SC2. Keep `ctx.log/warn/error` as internal diagnostics only; do not alias them to `ctx.out.*`.
SC3. Add stronger visual distinctions between `ctx.out` output bubble levels (`info`, `warn`, `error`).
SC4. Add stronger visual distinctions between command-output bubbles and command-state/result bubbles (`done`, `error`, `canceled`, help, system notices).
SC5. Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.

### Tooling / verification
TV1. Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.


### Fcommand internals

FI1. could we automatically generate the options/arguments section of an
Fcommand based on the options spec?
FI2. there should be a default help template that is used, into which we
substitute information from the Fcommand's metadata, unless the user has
overridden with their own template.
