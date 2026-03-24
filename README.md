# Factotum (MV3)

## Development

### Build

```bash
npm run build
```

### Load in Chrome (unpacked)

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `dist/` directory from this repo.

## Notes

- `dist/` is the package root for loading in Chrome.
- UI pages live under `dist/ui/`.
- Service worker entrypoint is `dist/sw/sw.js`.

## Status

- M1 is complete: storage, bundle import/export, omnibox resolution, MRU updates, and manager command listing are in place.
- The manager page now provides a `Bundle JSON` import/export flow for loading manual smoke-test fixtures.
- Current architecture direction: command runtime lives in USER_SCRIPT and accesses MAIN only through the explicit bridge.
- Core execution and session-console work are now in place: per-tab session reopen via `f -`, append-only bubble history, `ctx.out.*` command-visible output, non-auto-dismissing terminal states, busy/no-such-command system bubbles, and a wider resizable desktop console.
- Current near-term work is narrower: session-console visual refinement, manager import/export diagnostics polish, and the remaining bridge/RPC/requires surface.

## Guides

- [USER_GUIDE.md](/home/paxunix/repos/factotum/USER_GUIDE.md): basic extension usage
- [FCMD_AUTHORING.md](/home/paxunix/repos/factotum/FCMD_AUTHORING.md): writing fcommands
