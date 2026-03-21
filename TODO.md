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
- Overlay status UI appears to render duplicate terminal states for a single invocation (for example `Done` showing twice), likely because the overlay script/message listener is injected repeatedly per invocation.
- Cancel terminal state also appears duplicated (`Canceled.` shown twice), which is likely the same overlay/listener duplication bug.
- Cancel-on-navigation is currently broken: the overlay can remain stuck in `Running...`, the invocation can survive navigation visually, and Chrome may close the message channel when the page enters back/forward cache.
- MAIN should no longer be treated as a first-class top-level command runtime; remaining docs and code should converge on USER_SCRIPT runtime plus explicit MAIN bridge access.

### Omnibox / UX
- Manually verify the new prefix-suggestion UX in Chrome, including exact-resolution previews and `--help` suggestions.
- Decide whether omnibox suggestion descriptions should include localized text using the current UI language instead of the current fixed fallback behavior.
- If a command would require injection into the current tab and the tab is non-injectable (for example `chrome://`), consider surfacing that directly in omnibox suggestions instead of waiting for execution-time failure; this likely needs command metadata indicating whether injection is required.

### M2 follow-up
- Implement overlay/error feedback so `NO_SUCH_COMMAND`, busy-tab, and successful invocation states are visible outside the service worker console.
- Move the overlay from the upper-right corner to the upper-left corner.
- Revisit overlay dismissal UX and decide whether commands should be able to specify auto-dismiss behavior on completion/cancellation, or whether dismissal policy should remain runtime-controlled.
- Refactor the generated user-script wrapper so future `--debug` support has an obvious, stable boundary immediately before `main(argvTokens, ctx)` and makes it clear to the user where their command code starts and what to inspect next.
- Reconsider whether the per-tab busy guard should exist at all; possible alternatives include allowing concurrency generally or only blocking re-entry for the same fcommand in the same tab.

### M4 follow-up
- Add real `helpHtmlTemplate`/`optionsSpec` fixtures so the `--help` omnibox suggestion path can be exercised end to end.

### Tooling / verification
- Once Chrome MCP is available, use it to automate more of the manual smoke path and reduce reliance on service worker console inspection.
