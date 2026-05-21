# USER_GUIDE.md — Using Factotum

This guide is for people using the extension, not authoring commands.

## What Factotum does

Factotum lets you run installed fcommands from Chrome's omnibox keyword.

Current interaction model:
- open the omnibox keyword, then run a command
- command output appears in the per-tab session console overlay
- `f -` reopens the current tab's hidden session console
- typing a name or alias prefix shows matching commands in the omnibox, and Enter runs the first suggestion by default

## Basic usage

1. Type the omnibox keyword, for example `f`
2. Enter a command name or alias, or enough of a prefix to surface the command you want
3. Press Enter

Examples:
- `f ok`
- `f okcmd`
- `f pick`
- `f helpdemo --help`
- `f -`

Matching in the omnibox is case-insensitive. Factotum ranks matches in this order:
- exact command name
- exact alias
- command-name prefix
- alias prefix

Within the same bucket, the most recently run command comes first.

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

Aliases are user-defined shortcuts over the installed command set. They are stored globally, not inside command records, and one alias may point to more than one command.

In the Manager command list, use the filter field to match by command name, command ID, or alias. Use the Sort selector to order by modified time, name, or ID; the direction button uses Material Symbols `arrow_upward` and `arrow_downward`.

Use the Manager page to:
- import command bundles
- export current commands
- review quarantined invalid commands
- edit installed valid commands
- delete installed commands from the selected command card with the trash button

For maintained test fixtures, use:
- `fixtures/fixtures-v1.json`
- `fixtures/smoke-v1.json`

The current command editor supports existing valid commands. Select a command card to change:
- aliases in the Identity section as a space-delimited list, for example `123 abc d-ef`
- localized description JSON
- command code in the CodeMirror JavaScript editor, including standard editor affordances such as line numbers, folding, and bracket matching
- help HTML template in the CodeMirror HTML editor, including standard editor affordances such as line numbers, folding, and bracket matching
- help strings JSON
- options spec JSON
- requires JSON array

The Code and Help HTML template editors include an icon-only `code_xml` toolbar button. It reformats the current editor selection with Prettier using the JavaScript or HTML parser for that editor.

The Export section shows a read-only bundle for the selected command. The JSON includes the current editor contents and only the alias entries that target that command, so it can be pasted into Bundle Tools and imported directly.

Use the Enabled/Disabled status pill on the selected command card to enable or disable that command.
Use the trash button on the selected command card to permanently delete that command. There is no undo. Enabled commands must be disabled before deletion; quarantined invalid commands can be deleted directly.

The editor uses vertical section tabs for Identity, Description, Help, Options, Requires, Code, and Export. Select a tab to edit or inspect that part of the command while keeping the same whole-command Save and Reset actions.
Save Command is enabled only after an editable field changes; Reset returns the editor to the stored command and disables Save again.
If unsaved edits exist, selecting another command is blocked until you save or reset the current command. Reloading or navigating away from the manager page also triggers the browser's unsaved-changes prompt.
If you manually return the edited fields to their loaded values, Save Command disables again and the save-or-reset warning is dismissed.

Name and ID are read-only in the current editor. Use bundle import/export for rename-style changes until a dedicated rename/new-command flow exists.

## Current limitations

- only one command can run at a time per tab
- session console layout is still being refined
