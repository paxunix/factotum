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
- Async USER_SCRIPT commands are currently marked complete too early: long-running fixtures like `longrun@fixture.cancel.nav` can finish immediately from the service worker's point of view, which blocks real T8/T9 cancellation coverage and suggests the runtime is not awaiting `main()` settlement correctly.
- Cancel-on-navigation still has a race: after navigation cancel, the service worker can report `INVALID_INVOCATION` instead of a clean canceled result.
- `--help` is currently not intercepting normal execution: commands like `pick --help` still run `main()` and show a normal completion overlay instead of rendering help-only output.
- MAIN should no longer be treated as a first-class top-level command runtime; remaining docs and code should converge on USER_SCRIPT runtime plus explicit MAIN bridge access.

### Omnibox / UX
- Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
- Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
- If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.
- in manager UX, the diagnostic messages (e.g. when multiple commands are imported, or duplicates are found) are all concatenated in one line.  Show them on multiple lines for better readability.

### M2 follow-up
- Implement overlay/error feedback so `NO_SUCH_COMMAND`, busy-tab, and successful invocation states are visible outside the service worker console.
- Move the overlay from the upper-right corner to horizontally centered at top of page.
- Clear busy state immediately on cancellation so a new command can start before the canceled overlay finishes dismissing.
- Busy-tab refusal is currently easy to miss when the same command is already running: a second invocation can be rejected without any obvious visible overlay change.
- Revisit overlay dismissal UX and decide whether commands should be able to specify auto-dismiss behavior on completion/cancellation, or whether dismissal policy should remain runtime-controlled.
- Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.
- Reconsider whether the per-tab busy guard should exist at all; possible alternatives include allowing concurrency generally or only blocking re-entry for the same fcommand in the same tab.

### Tooling / verification
- Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
