Below is a **fixture pack specification** you can use as a single JSON bundle. It’s designed to be importable through your normal import path (same format as v1 export bundles), so the harness can install fixtures by “importing” rather than directly writing keys. That keeps tests closer to real usage.

---

# Fixture Pack Spec (v1)

## File: `fixtures-v1.json`

This is a normal import/export bundle:

```json
{
  "bundleSchemaVersion": 1,
  "exportedAt": 1760000000000,
  "commands": [
    {
      "schemaVersion": 1,
      "name": "pick",
      "id": "fixture.A",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { ctx.log('pick@fixture.A start'); await new Promise(r => setTimeout(r, 50)); ctx.log('pick@fixture.A done'); }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": { "title": "pick@fixture.A", "body": "Used for MRU resolution tests." }
      },
      "description": { "en-US": "MRU test A" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "pick",
      "id": "fixture.B",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { ctx.log('pick@fixture.B start'); await new Promise(r => setTimeout(r, 50)); ctx.log('pick@fixture.B done'); }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": { "title": "pick@fixture.B", "body": "Used for MRU resolution tests." }
      },
      "description": { "en-US": "MRU test B" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "longrun",
      "id": "fixture.cancel.nav",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { ctx.log('longrun started'); for (let i = 0; i < 1000000; i++) { if (ctx.signal?.aborted) { ctx.warn('longrun observed abort'); return; } await new Promise(r => setTimeout(r, 50)); } ctx.log('longrun finished'); }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": {
          "title": "longrun",
          "body": "Long-running cancellable command for navigation/tab-close cancel tests."
        }
      },
      "description": { "en-US": "Cancel-on-navigation test" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "badreq",
      "id": "fixture.requires.fail",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { ctx.log('badreq should not reach main'); }",
      "requires": [
        { "url": "https://example.invalid/does-not-exist.mjs", "kind": "module" }
      ],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": { "title": "badreq", "body": "Requires failure fixture." }
      },
      "description": { "en-US": "Requires failure fixture" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "bridge",
      "id": "fixture.main.bridge",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { await ctx.main.define('add', (a,b) => a + b); const out = await ctx.main.call('add', [2, 3]); ctx.log('bridge add result', out); }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": { "title": "bridge", "body": "Defines and calls a MAIN entrypoint." }
      },
      "description": { "en-US": "MAIN bridge define/call fixture" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "deny",
      "id": "fixture.denylisted",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { try { await ctx.chrome.management.getAll(); } catch (e) { ctx.error('denylisted call failed as expected', { name: e.name, message: e.message, code: e.code }); throw e; } }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": {
          "title": "deny",
          "body": "Attempts to call denylisted chrome.management API; must fail."
        }
      },
      "description": { "en-US": "Denylist fixture (chrome.management)" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    },
    {
      "schemaVersion": 1,
      "name": "events",
      "id": "fixture.events.unsupported",
      "world": "isolated",
      "code": "export async function main(argv, ctx) { try { ctx.chrome.bookmarks.onChanged.addListener(() => {}); } catch (e) { ctx.error('events unsupported as expected', { name: e.name, message: e.message, code: e.code }); throw e; } }",
      "requires": [],
      "helpHtmlTemplate": "<h1>{{title}}</h1><p>{{body}}</p>",
      "helpHtmlStrings": {
        "en-US": { "title": "events", "body": "Attempts to use chrome events; must fail in v1." }
      },
      "description": { "en-US": "Events unsupported fixture" },
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000
    }
  ],
  "aliases": {
    "cmd1": { "name": "pick", "id": "fixture.B" }
  }
}
```

### Notes / rationale

* `pick@fixture.A` and `pick@fixture.B` are used to test MRU ordering.
* `cmd1` alias maps to `pick@fixture.B` to test alias precedence.
* `longrun` is cancellable and checks `ctx.signal.aborted` frequently.
* `badreq` has a guaranteed-failing requires URL (`example.invalid` is reserved for invalid domains and should not resolve).
* `bridge` tests `ctx.main.define/call`.
* `deny` tests denylisted namespace handling.
* `events` tests event API rejection.
* Help content uses `helpHtmlTemplate` + `helpHtmlStrings` to match the localized help spec.

---

## How the harness should use this fixture pack

### Install path (recommended)

Use the normal import flow:

1. “Reset storage” (delete all `fcmd:*` keys)
2. Import bundle (same code path as user import)
3. Validate:

   * commands appear in `fcmd:index`
   * per-command keys exist
   * aliases exist

This ensures your import logic and storage layout are tested indirectly.

---

## Minimal expected assertions using the fixture pack

### MRU + alias

* Run `cmd1` → must run `pick@fixture.B` and set it MRU.
* Run `pick` → must pick `pick@fixture.B` MRU-first.

### Cancel on navigation

* Run `longrun`
* Navigate tab to a new URL → must cancel.

### Requires failure

* Run `badreq` → must fail before `main()` and log `REQUIRES_FAILED`.

### Bridge

* Run `bridge` → log contains “bridge add result 5”.

### Denylist / events

* Run `deny` → must fail with `UNSUPPORTED_MEMBER` (or your chosen code).
* Run `events` → must fail with `UNSUPPORTED_API_SHAPE`.

---
