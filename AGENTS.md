# AGENTS.md — Factotum “Don’t Drift” Checklist (v1)

This repo implements the **Factotum v1** spec. When using Codex/agents, the #1 risk is spec drift.
This checklist is the contract for all automated changes.

## Related docs (when to consult)
- `FACTOTUM_V1_HANDOFF.md`: Source of truth for all behavior and schema; always read before implementing.
- `TEST.md`: Use to select manual smoke tests and harness checks for your change.
- `DEVELOPING.md`: Use when modifying RPC exposure or debugging RPC/bridge/requires behavior.
- `fixture-pack.md`: Use when installing or validating fixtures for tests.
- `USER_GUIDE.md`: Use when a change affects how end users operate the extension.
- `FCMD_AUTHORING.md`: Use when a change affects how fcommand authors write or debug commands.

## 0) Golden rule
**If a change is not explicitly allowed by the v1 spec, do not implement it.**
Ask before changing semantics.
**If a command fails due to insufficient permissions, you must elevate the command to the user for approval.**

## 1) Authoritative docs
The following are authoritative, in this order:
1) `FACTOTUM_V1_HANDOFF.md` (v1 spec + protocols + tests)
2) `manifest.json` (as constrained by the spec)
3) Any `docs/*.md` explicitly labeled “authoritative” (if added later)

If there is a conflict, treat `FACTOTUM_V1_HANDOFF.md` as the source of truth and flag the conflict.

## 2) Scope control
Agents MUST:
- Implement only v1 features described in the handoff doc
- Avoid adding “nice-to-haves” (search suggestions, auto-migrations, UI helpers, background continuation, event bridging, ports)
- Avoid changing the storage schema unless explicitly required

Agents MUST NOT:
- Add frameworks (React/Vue/etc.)
- Add hot reload / dev server requirements
- Add persistent run history (logs are session-only in v1)
- Add timeouts or watchdogs (v1 has no timeouts)
- Add re-entrancy or multi-command concurrency per tab

## 3) Non-negotiable v1 semantics
Must be preserved exactly:

### Omnibox resolution
- POSIX-like tokenization (`shell-quote`)
- Option parsing (`mri`)
- Case-insensitive candidate matching across command names and alias keys
- Candidate ranking: exact name, exact alias, name prefix, alias prefix, then MRU within each bucket
- Pressing Enter runs the first suggestion by default; user selection may choose another candidate
- MRU updates on invocation start (not completion)
- Disabled commands are omitted from suggestions and execution

### Execution model
- MV3, tab-bound
- Hard error on non-injectable pages (no RPC-only fallback)
- One invocation per tab (no re-entrancy)
- Cancel on tab close AND top-level navigation commit
- No timeouts
- Top frame only

### Worlds and UI
- Command runtime is USER_SCRIPT; MAIN is accessed only through the explicit bridge
- Overlay ALWAYS in ISOLATED (shadow DOM), top frame only
- Help HTML is raw (no sanitization)

### Requires
- Sequential only
- Side-effect only (no returned handles)
- `data:` disallowed
- Default require world MAIN
- `world:"user_script"` allowed only for `kind:"module"` (best-effort)
- MAIN module requires use dynamic `import(url)` within MAIN host

### Bridging
- Use named entrypoints: `ctx.main.define(name, fn)` and `ctx.main.call(name, args)`
- Bridge messages must include `invocationId` + per-invocation `nonce`

### Privileged APIs
- `ctx.chrome` is a Proxy to SW RPC
- Expose all callable one-shot functions representable as RPC, except:
  - denylisted namespaces: `chrome.debugger`, `chrome.management`
  - no events, no ports, no listeners
- Promise-based only; SW promisifies callbacks

### Logging
- Single sink for runtime + command logs
- Session-only in-memory store
- Max 1000 entries, drop oldest
- Remove individual entries; clear all; oldest→newest
- Safe JSON stringify with circular replacer; capture stack traces

## 4) Implementation constraints
- Plain JS (no TypeScript required)
- Multi-page UI allowed
- esbuild-based tiny build (no heavy toolchain)
- No CDN runtime dependencies for extension code (bundle deps)
- **MUST:** All extension UI strings must use `chrome.i18n.getMessage` with `en` fallback; do not hard-code user-visible text in HTML/JS/CSS.

## 5) Required deliverables for non-trivial PRs
For any non-trivial change, agent must:
- Explain which v1 spec sections it implements
- Add/adjust tests or a manual test note referencing the Test Plan cases
- Call out any MV3/CSP edge cases discovered
- At each commit point, when the user indicates one has been reached, summarize the work done since the prior commit point and provide that summary as a concise markdown commit message suitable for `git commit`
- Prefer commit points that are narrowly scoped to a single feature or a single bug fix so future rebases, cherry-picks, and bisects stay straightforward
- Commit-point messages must say why the change was made, which bug(s) or failing tests it fixed, and any bug(s), regressions, or follow-up issues discovered during the work
- If a change reveals a new bug or regression that is not fixed in the same commit point, add it to `TODO.md` and mention that follow-up in the commit message so repo history explains both the decision and the remaining gap
- At each commit point, the agent may create the commit directly when the user instructs it to do so
- At each commit point, update the relevant `*.md` docs so they reflect the post-change repo state, including removing items that are now complete, obsolete, or no longer needed because the latest work superseded them
- At each commit point, if the change affects end-user workflows or fcommand-author workflows/APIs, update `USER_GUIDE.md` and/or `FCMD_AUTHORING.md` as part of the same doc sweep
- Do not preserve stale “done” state in docs just for history; source control is the history. Prefer removing or rewriting outdated items so docs describe current reality and next steps only

## 5.1) Markdown doc hygiene at commit points
When closing a commit point, agents must sweep the relevant markdown docs and eliminate drift across them.

Agents MUST:
- Update all relevant `*.md` files touched by the completed work, not just the code-adjacent doc
- Include audience docs such as `USER_GUIDE.md` and `FCMD_AUTHORING.md` whenever user-facing behavior or author-facing APIs/contracts changed
- Remove checklist items, TODO entries, and caveats that are no longer needed because the work is complete or the latest design made them obsolete
- Rewrite remaining next steps so they match the new repo state
- Keep spec, plan, tests, and development notes consistent with each other
- Keep user and author guides consistent with the current repo behavior whenever they are in scope
- Keep fixture examples, import bundles, and manual-test snippets valid under the current schema and runtime contract so they can still be used without repair

Agents MUST NOT:
- Leave completed items in place marked as done if removing or rewriting them would leave a cleaner current-state doc
- Preserve outdated workaround notes once the underlying issue is fixed, unless they are still needed as active guidance
- Leave stale sample JSON or code snippets that no longer import or execute under the current repo state

## 6) Stop conditions (ask before proceeding)
Agent must STOP and ask before:
- Changing message formats / protocol constants
- Changing storage keys or schema fields
- Adding permissions beyond “broad permissive” defaults in v1 (except when required by Chrome)
- Adding new UI helpers beyond overlay
- Adding event/port bridging or background continuation

## 7) Definition of done
A change is “done” only if:
- It passes the v1 manual smoke suite relevant to the change
- It does not alter v1 semantics
- It updates the relevant `*.md` docs so they reflect the new current state without stale completed or obsolete items
