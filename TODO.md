# TODO.md — Deferred Work and Follow-Ups

Use this file to capture work that should not be forgotten but does not belong on the current critical path.
Items here may be bugs, UX polish, wishlist ideas, or later-milestone follow-ups.

## Rules
- Keep entries concise and actionable.
- Entries should be prefix+numbered so it's clear what section they belong to and can be uniquely identified within this file.  No requirement the numbers remain monotonically increasing from entry to entry.
- Remove entries when they are completed.
- If an item changes intended behavior, reflect that in `FACTOTUM_V1_HANDOFF.md` and any relevant audience docs as needed.
- Do not treat TODO items as spec changes unless the authoritative docs are updated too.

## Current TODOs

### Omnibox / UX
O3. Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
O4. If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.

### Manager / editor UX
M3. Add help-template preview. Preferred direction: render preview through the same overlay UI used by command help, overlaying on the manager page and dismissible by the user.
M4. Replace JSON textareas with friendlier structured editors over time for localized descriptions, help strings, optionsSpec, and requires. For localized text, prefer a locale selector plus add-locale flow over raw JSON editing.
M5. Revisit the Help editor layout now that the help HTML template uses CodeMirror. Decide whether the template editor should expand, collapse, or sit beside the Help strings JSON editor.
M8. manager UX needs a separate tab to hold overall settings.
M17. CodeMirror editors should support user-specific configuration of their options, such as a JSON config blob for editor setup.
### Overlay UX

OU1. an additional settings toggle area at the bottom of the overlay that houses buttons for adjusting overlay settings.  The settings are persisted for the extension beyond current page and session..
    - setting for toggling whether the overlay is light or dark, probably based on the page on which the overlay is loaded.
    - setting for changing overlay opacity

### Session console redesign
SC1. Auto-scroll the session console to the bottom after each new write only when the user is already at the bottom; if the scroll thumb is away from the end, preserve the user's scroll position so history inspection is not interrupted.
SC2. Keep `ctx.log/warn/error` as internal diagnostics only; do not alias them to `ctx.out.*`.
SC6. Include the return value from the fcmd in the output written to overlay when the fcmd completes.  Similarly for any error.

### Tooling / verification
TV1. Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
TV2. Do a focused conformance pass on storage/import/export edge cases to verify the current implementation still matches `FACTOTUM_V1_HANDOFF.md` after the manager and bundle UX iterations.
TV3. Do a focused conformance pass on omnibox and runtime behavior to verify the checked-in implementation still matches `FACTOTUM_V1_HANDOFF.md` after the recent resolution and session-console changes.

### Fcommand internals

FI1. could we automatically generate the options/arguments section of an
Fcommand based on the options spec?
FI2. there should be a default help template that is used, into which we
substitute information from the Fcommand's metadata, unless the user has
overridden with their own template.
