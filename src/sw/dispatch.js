import {
  getAliasMap,
  getCommand,
  listCommandIndex,
  resolveLocalizedText,
  updateCommandMru
} from './storage.js';
import { isInjectableUrl } from './injectability.js';
import { formatNoSuchCommandSuggestion, resolveCommand } from './omnibox.js';
import { parseCommandArgv } from './argv.mjs';
import { escapeHtml } from '../shared/html.js';

let omniboxSessionState = {
  indexCommands: null,
  aliases: null
};

async function loadOmniboxState() {
  const [indexCommands, aliases] = await Promise.all([
    listCommandIndex(),
    getAliasMap()
  ]);

  omniboxSessionState = { indexCommands, aliases };
  return omniboxSessionState;
}

function getSessionState() {
  if (omniboxSessionState.indexCommands && omniboxSessionState.aliases) {
    return omniboxSessionState;
  }
  return null;
}

function getMessage(key, fallback) {
  return chrome.i18n.getMessage(key) || fallback;
}

function buildResolutionLabel(matchKind) {
  switch (matchKind) {
    case 'qualified':
      return getMessage('omniboxResolutionQualified', 'selected');
    case 'exact-name':
      return getMessage('omniboxResolutionExactName', 'name');
    case 'exact-alias':
      return getMessage('omniboxResolutionExactAlias', 'alias');
    case 'prefix-name':
      return getMessage('omniboxResolutionPrefixName', 'name prefix');
    case 'prefix-alias':
      return getMessage('omniboxResolutionPrefixAlias', 'alias prefix');
    default:
      return getMessage('omniboxResolutionMatch', 'match');
  }
}

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.url || '';
}

function buildResolvedSuggestion(candidate, argvTokens, canInject) {
  const description = resolveLocalizedText(candidate.command.description, 'en-US');
  const detailParts = [
    `${candidate.command.name}@${candidate.command.id}`,
    buildResolutionLabel(candidate.matchKind)
  ];

  if (candidate.matchedAlias) {
    detailParts.push(candidate.matchedAlias);
  }

  if (candidate.command.disabled) {
    detailParts.push(getMessage('managerCommandDisabled', 'Disabled'));
  }
  if (canInject === false) {
    detailParts.push(getMessage('overlayCannotInject', 'Cannot run on this page.'));
  }

  const suffix = description ? ` - ${description}` : '';
  return {
    content: `${candidate.command.name}@${candidate.command.id}${argvTokens.length > 0 ? ` ${argvTokens.join(' ')}` : ''}`,
    description: `${escapeHtml(detailParts.join(' · '))}${escapeHtml(suffix)}`
  };
}

function buildHelpSuggestion(resolution, canInject) {
  if (!resolution.command.helpHtmlTemplate && !resolution.command.optionsSpec) {
    return null;
  }

  const detailParts = [
    `${resolution.command.name}@${resolution.command.id}`,
    getMessage('omniboxHelpPreview', 'help preview')
  ];
  if (canInject === false) {
    detailParts.push(getMessage('overlayCannotInject', 'Cannot run on this page.'));
  }

  return {
    content: `${resolution.command.name}@${resolution.command.id} --help`,
    description: `${escapeHtml(detailParts.join(' · '))}`
  };
}

export async function preloadOmniboxSession() {
  await loadOmniboxState();
}

export async function resolveInvocationInput(text) {
  const state = getSessionState() || await loadOmniboxState();
  const { indexCommands, aliases } = state;

  const resolution = resolveCommand(indexCommands, aliases, text);
  if (!resolution.ok) {
    return resolution;
  }

  const fullCommand = await getCommand(resolution.command.name, resolution.command.id);
  const command = fullCommand || resolution.command;
  let argv;
  try {
    argv = parseCommandArgv(resolution.argvTokens, command.optionsSpec);
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'INVALID_ARGS',
      message: error.message || String(error),
      argvTokens: resolution.argvTokens,
      rawTokens: resolution.rawTokens
    };
  }

  return {
    ...resolution,
    command,
    argv
  };
}

export async function startInvocation(text) {
  const resolution = await resolveInvocationInput(text);
  if (!resolution.ok) {
    return resolution;
  }

  const mruAt = Date.now();
  await updateCommandMru(resolution.command.name, resolution.command.id, mruAt);

  return {
    ...resolution,
    mruAt
  };
}

export async function markInvocationStart(command) {
  const mruAt = Date.now();
  await updateCommandMru(command.name, command.id, mruAt);
  return mruAt;
}

export async function getOmniboxSuggestions(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return [];
  }

  const state = getSessionState() || await loadOmniboxState();
  const resolution = resolveCommand(state.indexCommands, state.aliases, trimmed);
  if (!resolution.ok) {
    return [{
      content: trimmed,
      description: formatNoSuchCommandSuggestion(trimmed)
    }];
  }

  const activeTabUrl = await getActiveTabUrl();
  const canInject = activeTabUrl ? isInjectableUrl(activeTabUrl) : null;

  const suggestions = resolution.candidates
    .slice(0, 6)
    .map((candidate) => buildResolvedSuggestion(candidate, resolution.argvTokens, canInject));

  const fullCommand = await getCommand(resolution.command.name, resolution.command.id);
  if (fullCommand) {
    const helpSuggestion = buildHelpSuggestion({
      ...resolution,
      command: fullCommand
    }, canInject);
    if (helpSuggestion) {
      suggestions.push(helpSuggestion);
    }
  }

  return suggestions;
}
