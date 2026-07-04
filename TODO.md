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

### Manager / editor UX
M4. Replace the remaining JSON textarea with a friendlier structured editor for optionsSpec.
M8. manager UX needs a separate tab to hold overall settings.
M17. CodeMirror editors should support user-specific configuration of their options, such as a JSON config blob for editor setup.
### Overlay UX

OU2. Persist overlay theme preference beyond the current page session and decide whether that preference should be global or page-sensitive.
OU3. Add an overlay opacity control in the bottom action area and persist the chosen opacity with the rest of the overlay preferences.

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
