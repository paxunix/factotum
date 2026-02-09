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
