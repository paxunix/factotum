# Factotum (MV3)

User-defined commands for Chrome.

Remember [Ubiquity](https://wiki.mozilla.org/Labs/Ubiquity) for Firefox?  It
was a CLI-addict's dream.  When I left Firefox behind in favour of Chrome, I
really, really missed Ubiquity.

This is my attempt at making something similar and hopefully better, though
definitely without goals quite so lofty:  there's no attempt at
natural-language parsing (nor do I ever want there to be), and it has no
custom API to make the writing of a Factotum Command (i.e. Fcommand) easier
or prettier.  If anything, it generally adheres to the early Soviet space
program's design sensibilities:  utterly spare interface, myriad sharp
edges, and no concessions to beauty (it would be made of concrete and steel
if those things were available via Chrome API).  This extension is for
people who type in a command and want the same thing to happen every time.

Most importantly, it is a work in progress, as it is also a test-bed for me
to muck around with fancy new HTML5 features that Chrome has been
accumulating.

**Be aware that you can fuck up your computer and possibly your life quite
badly with this extension.  It allows Chrome to execute arbitrary code with
full privileges.  This means a thoughtlessly-executed command line running a
suspiciously-written Fcommand can do things like:**

1. **Send all your porn bookmarks to your employer.**
2. **Email your bank-account information to North Korean hackers.**
3. **Render your computer completely unusable.**

**This extension is intended for developers and people who understand not
only Javascript, but probably Chrome extensions as well.**

**I'm not joking.  Do not fuck around with this unless you know what you are
doing.  If you shoot yourself in the face, don't come crying to the person
who gave you a free gun full of free bullets.**

## Development

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Build tarball

```bash
npm run build:tarball
```

This creates `release/factotum-<version>.tar.gz`. Expanding that tarball
produces a `factotum-<version>/` directory containing the unpacked extension
root, ready to load in Chrome.

### Load in Chrome (unpacked)

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `dist/` directory from this repo, or the extracted
   `factotum-<version>/` directory from `release/factotum-<version>.tar.gz`.
5. Enable "Allow User Scripts".

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
