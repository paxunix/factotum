import {
  getAliasMap,
  getCommand,
  listCommandIndex,
  resolveLocalizedText,
  updateCommandMru
} from './storage.js';
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

function buildResolutionLabel(matchKind) {
  switch (matchKind) {
    case 'qualified':
      return 'selected';
    case 'exact-name':
      return 'name';
    case 'exact-alias':
      return 'alias';
    case 'prefix-name':
      return 'name prefix';
    case 'prefix-alias':
      return 'alias prefix';
    default:
      return 'match';
  }
}

function buildResolvedSuggestion(candidate, argvTokens) {
  const description = resolveLocalizedText(candidate.command.description, 'en-US');
  const detailParts = [
    `${candidate.command.name}@${candidate.command.id}`,
    buildResolutionLabel(candidate.matchKind)
  ];

  if (candidate.matchedAlias) {
    detailParts.push(candidate.matchedAlias);
  }

  if (candidate.command.disabled) {
    detailParts.push('disabled');
  }

  const suffix = description ? ` - ${description}` : '';
  return {
    content: `${candidate.command.name}@${candidate.command.id}${argvTokens.length > 0 ? ` ${argvTokens.join(' ')}` : ''}`,
    description: `${escapeHtml(detailParts.join(' · '))}${escapeHtml(suffix)}`
  };
}

function buildHelpSuggestion(resolution) {
  if (!resolution.command.helpHtmlTemplate && !resolution.command.optionsSpec) {
    return null;
  }

  return {
    content: `${resolution.command.name}@${resolution.command.id} --help`,
    description: `${escapeHtml(`${resolution.command.name}@${resolution.command.id} · help preview`)}`
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

  const suggestions = resolution.candidates
    .slice(0, 6)
    .map((candidate) => buildResolvedSuggestion(candidate, resolution.argvTokens));

  const fullCommand = await getCommand(resolution.command.name, resolution.command.id);
  if (fullCommand) {
    const helpSuggestion = buildHelpSuggestion({
      ...resolution,
      command: fullCommand
    });
    if (helpSuggestion) {
      suggestions.push(helpSuggestion);
    }
  }

  return suggestions;
}
