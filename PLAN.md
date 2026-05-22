# PLAN.md — Current State and Next Work

This is a live orientation doc for future changes. It describes the current implementation shape and the active work worth doing next. It is not milestone history.

## Read this with
- `FACTOTUM_V1_HANDOFF.md` for authoritative behavior and schema
- `TEST.md` for manual smoke coverage and lightweight automated checks
- `TODO.md` for the backlog
- `DEVELOPING.md` for RPC, bridge, and runtime troubleshooting
- `USER_GUIDE.md` and `FCMD_AUTHORING.md` when a change affects users or command authors

## Current architecture

### Runtime
- Commands execute in `USER_SCRIPT` via `chrome.userScripts`.
- `MAIN` is only accessed through `ctx.main.define()` and `ctx.main.call()`.
- One invocation may run per tab.
- Invocations cancel on tab close and top-level navigation.

### Omnibox
- Input is tokenized with `shell-quote` and option parsing uses `mri`.
- Matching is case-insensitive across command names and alias keys.
- Candidate ranking is: exact name, exact alias, name prefix, alias prefix, then MRU within each bucket.
- Pressing Enter runs the first suggestion by default.
- Disabled commands are omitted.

### Session console
- The command-facing UI is a per-tab session console overlay in ISOLATED world.
- `f -` reopens the current tab's hidden session console.
- Help, command output, system notices, and terminal states share the same append-only bubble stream.
- Commands may set `showOverlay: false` to suppress normal auto-show behavior while still recording session history; hard execution errors still force visibility.

### Manager
- The manager uses top-level `Manager` and `Utilities` tabs.
- The `Manager` tab provides a command list, selected-command card, and a sectioned editor.
- The editor supports new-command drafts, rename-by-save, version editing, alias editing, overlay-preference editing, enable/disable, and disable-before-delete hard deletion.
- Code and help-template editing use CodeMirror with explicit `JS`, `HTML`, and `CSS` formatting actions.
- Per-command Export emits only the command record.
- Utilities import accepts either a single command record or a full bundle.
- Utilities export emits the full bundle.

## Important code locations
- `src/sw/dispatch.js`: omnibox resolution and invocation setup
- `src/sw/inject.js`: execution pipeline, session console coordination, cancellation, help path, RPC request handling
- `src/sw/storage.js`: command storage, bundle import/export, aliases, quarantine handling
- `src/sw/validation.js`: command and alias normalization/validation
- `src/ui/manager.js`: manager UI behavior and editor logic
- `src/bridge/main_host.js`: MAIN bridge host
- `src/overlay/overlay.js`: injected overlay/session console UI

## Active priorities

### Session console polish
- Distinguish output levels more clearly.
- Distinguish command-state/system bubbles more clearly.
- Auto-scroll only when the user is already at the bottom.
- Keep the generated wrapper boundary clean for future debug-oriented work.

### Manager UX
- Add help-template preview through the same overlay used by command help.
- Replace more raw JSON editing with structured editors where practical.
- Improve bundle import UX with overwrite awareness and selective import.
- Add editor-option configuration for CodeMirror.
- Add overall settings UI.

### Verification
- Improve repeatable automation around the manual smoke flow.
- Use Chrome MCP where it meaningfully reduces console-driven manual checking.
