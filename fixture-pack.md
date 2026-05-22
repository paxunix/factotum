# Fixture Pack Spec (v1)

Use checked-in import bundles for manual and harness testing rather than copying JSON out of this doc.

## Related docs
- `FACTOTUM_V1_HANDOFF.md`: Canonical fixture requirements and bundle schema.
- `TEST.md`: Manual and harness assertions that reference these fixtures.

## Bundles

### Canonical bundle
- File: [`fixtures/fixtures-v1.json`](/home/paxunix/repos/factotum/fixtures/fixtures-v1.json)
- Purpose: shared fixture pack for MRU, requires, bridge, RPC, help, and navigation-cancel checks
- Commands:
  - `pick@fixture.A`
  - `pick@fixture.B`
  - `longrun@fixture.cancel.nav`
  - `badreq@fixture.requires.fail`
  - `reqorder@fixture.requires.order`
  - `reqdata@fixture.requires.data`
  - `reqmod@fixture.requires.main.module`
  - `requsermod@fixture.requires.user.module.fail`
  - `bridge@fixture.main.bridge`
  - `deny@fixture.denylisted`
  - `events@fixture.events.unsupported`
  - `workflow@fixture.sw.roundtrip`
  - `clonefail@fixture.rpc.uncloneable`
  - `helpdemo@fixture.help.basic`
- Aliases:
  - `cmd1 -> pick@fixture.B`

### Smoke bundle
- File: [`fixtures/smoke-v1.json`](/home/paxunix/repos/factotum/fixtures/smoke-v1.json)
- Purpose: small ad hoc bundle for quick manual overlay checks without importing the full canonical pack
- Commands:
  - `ok@demo.ok`
  - `canceldemo@demo.cancel`
  - `outputdemo@demo.output`
- Aliases:
  - `okcmd -> ok@demo.ok`

## Usage

### Normal import flow
1. Reset storage if you want a clean manual-testing state.
2. Import one or both bundles through the manager import UI.
3. Verify `fcmd:index`, per-command keys, and aliases through the normal extension flows.

### Fixture map
- `ok@demo.ok`: T1, T2, T5, T7
- `canceldemo@demo.cancel`: T8
- `outputdemo@demo.output`: T21, T21b
- `pick@fixture.A` and `pick@fixture.B`: T3, T3b, T4a, T4b
- `longrun@fixture.cancel.nav`: T9, T10
- `badreq@fixture.requires.fail`: external requires-failure check
- `reqorder@fixture.requires.order`: T11
- `reqdata@fixture.requires.data`: T12
- `reqmod@fixture.requires.main.module`: T13
- `requsermod@fixture.requires.user.module.fail`: T14
- `bridge@fixture.main.bridge`: T15
- `deny@fixture.denylisted`: T18
- `events@fixture.events.unsupported`: T19
- `workflow@fixture.sw.roundtrip`: T17
- `clonefail@fixture.rpc.uncloneable`: T20
- `helpdemo@fixture.help.basic`: T7b, T7c

## Maintenance rules
- Keep fixture JSON importable under the current command schema.
- Keep alias bundle data in the canonical one-to-many form: each alias key maps to an array of `{ name, id }` command refs, even when there is only one target.
- Keep fixture command records on the current valid command `world`.
- Keep fixture code snippets aligned with the current runtime entrypoint contract.
- Prefer changing the checked-in `.json` files and updating this index doc, rather than embedding large JSON blobs here.
