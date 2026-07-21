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

### Manager / editor UX
M8. manager UX needs a separate tab to hold overall settings.
### Overlay UX

OU2. Persist overlay theme preference beyond the current page session and decide whether that preference should be global or page-sensitive.

### Architecture / refactoring

AR1. Generalize the manager stacked editable-row pattern so Description, Help strings, Options, Option descriptions, and Requires use shared row lifecycle helpers instead of repeating snapshot/validate/render/add/populate/read code.
AR2. Extract bundle import/export review model and rendering from `src/ui/manager.js` into a focused module with pure filtering, sorting, selection, and review-state helpers covered by unit tests.
AR3. Move USER_SCRIPT runner code generation out of `src/sw/inject.js` into a dedicated runner-template module while preserving the current generated source layout and `--debug` behavior.
AR4. Consolidate repeated extension i18n fallback helpers into shared code so manager, overlay, service worker dispatch, inject, and help rendering use the same behavior.
AR5. Consolidate error serialization helpers so runtime message handlers, RPC, bridge, and invocation finalization do not hand-build subtly different error payloads.
AR6. Factor manager list filter/sort/direction mechanics into reusable helpers shared by Installed Commands and bundle export review lists.
AR7. Rework bundle import/export storage flow toward a normalize/plan/apply structure so overwrite warnings, invalid command preservation, and alias updates are easier to reason about and test.

### Tooling / verification
TV1. Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
TV2. Do a focused conformance pass on storage/import/export edge cases to verify the current implementation still matches `FACTOTUM_V1_HANDOFF.md` after the manager and bundle UX iterations.
TV3. Do a focused conformance pass on omnibox and runtime behavior to verify the checked-in implementation still matches `FACTOTUM_V1_HANDOFF.md` after the recent resolution and session-console changes.
