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
M6. Add ACE for the command code editor as a separate checkpoint from the structural manager layout pivot.
M8. manager UX needs a separate tab to hold overall settings.
M9. Fcommands need metadata indicating the user's preference for whether the overlay should be shown for the command or not.  This lets a user/author have fcommand behaviour that has no Factotum UI.  All the same information would be recorded and logged as usual, only the overlay would not show like it usually does during command invocation, execution, and completion. This setting can be modified by the user by editing the fcommand.
M10. if any unsaved edits exist when a new command is about to be edited, the user needs to be notified and the new edit action blocked until existing changes are saved or reset.  In that case, the display should reselect the command that was being edited and user prompted to save or reset.
M11. in Identity editor section, need to be able to edit the set of aliases for the fcommand
M12. No need to duplicate the Disabled toggle in the editor panel and in the Installed fcommand card panel.  Keep the toggle button that is in the card, drop the one in the editor.  The toggle in the card itself should just be the boolean toggle checkbox control currently in the editor panel.  It should continue to update the UI and whatever storage is needed to indicate to the extension that the fcommand is available or not.
M13. don't need an actual Edit button.  As soon as the user clicks a card in the Installed list, load up its information in the editor panel.  Note that we have to account for behaviour if currently editing another command and it has unsaved changes (see M10).
M14. need a sort pulldown menu (put it right-aligned to panel of the filter commands text entry, which can be shrunk to accomodate it).  Also need the usual icon indicating ascending or descending sort.  Sort options: by modified time, by name, by ID.  Default will be by descending modified time.
M15. Save Command button should only be active if an edit has occurred.
M16. Bundle json import textarea should fill the panel and of course have its own scrollbar so the page itseld doesn't scroll (similar to what was done for the code text widget).


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

