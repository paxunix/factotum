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

## Current implementation

- Command runtime lives in `USER_SCRIPT` and reaches page context only through `ctx.main`.
- The per-tab session console is reopened with `f -` and holds command output, help, and terminal state history for that tab.
- There is no separate Logs page; the manager is the only extension page surfaced from the popup.
- The manager provides command editing, import/export, aliases, enable/disable, deletion, and per-command export.
- The remaining forward-looking work lives in [TODO.md](/home/paxunix/repos/factotum/TODO.md).

## Guides

- [USER_GUIDE.md](/home/paxunix/repos/factotum/USER_GUIDE.md): basic extension usage
- [FCMD_AUTHORING.md](/home/paxunix/repos/factotum/FCMD_AUTHORING.md): writing fcommands
