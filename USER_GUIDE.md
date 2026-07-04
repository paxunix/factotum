# USER_GUIDE.md — Using Factotum

This guide is for people using the extension, not authoring commands.

## What Factotum does

Factotum lets you run installed fcommands from Chrome's omnibox keyword.

Current interaction model:
- open the omnibox keyword, then run a command
- command output appears in the per-tab session console overlay
- `f -` reopens the current tab's hidden session console
- typing a name or alias prefix shows matching commands in the omnibox, and Enter runs the first suggestion by default
- on non-injectable pages such as `chrome://...`, matching omnibox suggestions warn that the command cannot run on the current page before you press Enter

## Basic usage

1. Type the omnibox keyword, for example `f`
2. Enter a command name or alias, or enough of a prefix to surface the command you want
3. Press Enter

Examples:
- `f ok`
- `f okcmd`
- `f pick`
- `f helpdemo --help`
- `f ok --debug`
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

When a command returns a value, the terminal `Done` bubble includes it. When a command fails, the terminal `Error` bubble includes the normalized error details.

Bubble styling:
- output bubbles use a left-edge severity bar: green for ordinary/info output, yellow for warnings, red for errors
- command-state and system-result bubbles use their own left-edge bars and tinted backgrounds so running/help, done, canceled/busy, and error states are easier to distinguish at a glance
- the bottom action bar includes a theme toggle that switches between the default dark console and a light console
- the theme toggle applies immediately and lasts for the current page session only

Commands can also be configured so the overlay does not auto-show during normal runs. In that mode:
- the command still records the same session history
- `f -` reopens that tab's hidden history later
- hard execution errors still force the overlay visible

On desktop:
- the console opens wider than the original narrow card layout
- the scrollback region can be resized vertically
- opening or reopening the console jumps to the newest entries
- if you scroll up to inspect history, new output does not force you back to the bottom; auto-scroll resumes once you are already back at the end

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

## Debugging

Use:

```text
f somecommand --debug
```

If DevTools is open for the page context, Factotum inserts a `debugger;` stop immediately before the command's `main(argv, ctx)` runs.

## Canceling

For long-running commands:
- click `Cancel` in the session console
- navigation and tab close also cancel the running command

The session console is scoped to the current page session in a tab. Dismissing it only hides it, and `f -` reopens it while you remain on the same page. A top-level navigation starts a fresh page session and clears the prior session console history.

If you try to run another command in the same tab while one is already running:
- Factotum keeps the original command running
- the session console adds a busy notice naming the running command
- cancel it or wait for it to finish before starting another command in that tab

## Manager import/export

The Manager page has top-level Manager and Utilities tabs:
- Manager: installed commands on the left and a sectioned command editor on the right
- Utilities: bundle import/export tools with a full-height, internally scrolling bundle JSON field

Aliases are user-defined shortcuts over the installed command set. They are stored globally, not inside command records, and one alias may point to more than one command.

In the Manager command list, use the filter field to match by command name, command ID, or alias. Use the Sort selector to order by modified time, name, or ID; the direction button toggles ascending vs descending order.

Use the Manager page to:
- import command bundles
- export current commands
- review quarantined invalid commands
- edit installed valid commands
- delete installed commands from the selected command card with the trash button

For maintained test fixtures, use:
- `fixtures/fixtures-v1.json`
- `fixtures/smoke-v1.json`

The current command editor supports both creating new commands and editing existing valid commands. Use `New Command` to open a draft, or select an installed command to edit it. In the Identity section you can change:
- name
- ID
- version as informational command metadata
- aliases as a space-delimited list, for example `123 abc d-ef`
- whether the command shows the overlay by default during normal runs
- localized descriptions as a stacked locale/description editor with add and delete controls
- command code in the CodeMirror JavaScript editor, including standard editor affordances such as line numbers, folding, and bracket matching
- help HTML template in the CodeMirror HTML editor, including standard editor affordances such as line numbers, folding, and bracket matching
- help strings as nested locale blocks with token/value rows
- options spec JSON
- requires as a stacked row editor with typed URL, kind, and world fields

The Code and Help HTML template editors include `JS`, `HTML`, and `CSS` toolbar buttons. With no selection, the chosen button reformats the whole editor document. With a selection, it reformats only the selected text with the chosen Prettier parser, which is useful for embedded snippets. If the selected parser does not match valid content, the editor shows an inline error and leaves the text unchanged.

The Export section shows a read-only JSON representation of the selected fcommand itself. It does not include alias data or a bundle wrapper.

Use the switch or the Enabled/Disabled status pill on the selected command card to enable or disable that command.
Use the trash button on the selected command card to permanently delete that command. There is no undo. Enabled commands must be disabled before deletion; quarantined invalid commands can be deleted directly.
Quarantined invalid commands remain editable in the manager so you can repair and save them back into normal valid state.

The editor uses vertical section tabs for Identity, Description, Help, Options, Requires, Code, and Export. Select a tab to edit or inspect that part of the command while keeping the same whole-command Save and Reset actions.
Inside the Help section, a nested `Edit` / `Preview` tab set lets you switch between authoring the template and seeing the rendered help bubble for the current unsaved draft. Normal localized command text and help use the browser UI language with `en-US` fallback. The Preview tab includes a locale selector so you can explicitly inspect locale-specific help output without running the command.

If you rename a command by changing its Name or ID, saving moves the command to the new identity instead of creating a duplicate under the old one. Save is blocked when another command already uses the same `name@id`.
Save Command is enabled only after an editable field changes; Reset returns the editor to the stored command and disables Save again.
If unsaved edits exist, selecting another command is blocked until you save or reset the current command. Reloading or navigating away from the manager page also triggers the browser's unsaved-changes prompt.
If you manually return the edited fields to their loaded values, Save Command disables again and the save-or-reset warning is dismissed.
Warning and error status messages in the manager can be dismissed directly from their status area.

Utilities import accepts either a single fcommand JSON record or a full Factotum bundle JSON object.
- both single-command and full-bundle imports now open a review step before anything is written
- the review lets you choose which commands, quarantined invalid records, and aliases to import
- the review filter matches the same kinds of substrings as the Installed Commands list: command name, ID, `name@id`, aliases, and alias targets
- the review marks items as `New`, `Same`, `Overwrite`, `Overwrites invalid`, or `Overwrites valid` so you can see what will replace installed data before importing

Utilities export remains the whole-extension bundle export surface.
- exporting a full bundle now opens a review step where you choose which commands, quarantined invalid records, and aliases to include
- the same review filter is available during export review
- the bundle JSON is written only after you confirm the reviewed subset

## Current limitations

- only one command can run at a time per tab
