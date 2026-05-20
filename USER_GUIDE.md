# USER_GUIDE.md — Using Factotum

This guide is for people using the extension, not authoring commands.

## What Factotum does

Factotum lets you run installed fcommands from Chrome's omnibox keyword.

Current interaction model:
- open the omnibox keyword, then run a command
- command output appears in the per-tab session console overlay
- `f -` reopens the current tab's hidden session console

## Basic usage

1. Type the omnibox keyword, for example `f`
2. Enter a command such as `ok@demo.ok`
3. Press Enter

Examples:
- `f ok@demo.ok`
- `f pick`
- `f helpdemo --help`
- `f -`

## What the overlay shows

The session console is per-tab.

It keeps:
- command result bubbles
- help bubbles
- system notice bubbles like busy/no-such-command
- command-visible output from `ctx.out.*`

On desktop:
- the console opens wider than the original narrow card layout
- the scrollback region can be resized vertically

It does not survive tab close.

## Closing and reopening

- `Close` hides the session console
- `f -` reopens it for the current tab
- closing the tab discards that tab's session history

## Help

Use:

```text
f somecommand --help
```

This shows the command's help content in the session console instead of running the command.

## Canceling

For long-running commands:
- click `Cancel` in the session console
- navigation and tab close also cancel the running command

If you try to run another command in the same tab while one is already running:
- Factotum keeps the original command running
- the session console adds a busy notice naming the running command
- cancel it or wait for it to finish before starting another command in that tab

## Manager import/export

The Manager page has top-level Manager and Utilities tabs:
- Manager: installed commands on the left and a sectioned command editor on the right
- Utilities: bundle import/export tools with a full-height, internally scrolling bundle JSON field

Use the Manager page to:
- import command bundles
- export current commands
- review quarantined invalid commands
- edit installed valid commands

For maintained test fixtures, use:
- `fixtures/fixtures-v1.json`
- `fixtures/smoke-v1.json`

The current command editor supports existing valid commands. Select `Edit` on a command card to change:
- disabled state
- localized description JSON
- command code in the ACE editor
- help HTML template
- help strings JSON
- options spec JSON
- requires JSON array

The editor uses vertical section tabs for Identity, Description, Help, Options, Requires, and Code. Select a tab to edit that part of the command while keeping the same whole-command Save and Reset actions.

Name and ID are read-only in the current editor. Use bundle import/export for rename-style changes until a dedicated rename/new-command flow exists.

## Current limitations

- only one command can run at a time per tab
- session console layout is still being refined
