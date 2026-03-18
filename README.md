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
- The next milestone is M2: injection, overlay, busy-guard, and cancellation.
