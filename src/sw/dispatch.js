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

function splitInput(text) {
  const trimmed = String(text || '').trim();
  const firstWhitespace = trimmed.search(/\s/);
  if (firstWhitespace < 0) {
    return {
      cmdToken: trimmed,
      remainder: ''
    };
  }

  return {
    cmdToken: trimmed.slice(0, firstWhitespace),
    remainder: trimmed.slice(firstWhitespace)
  };
}

function buildResolvedSuggestion(resolution) {
  const description = resolveLocalizedText(resolution.command.description, 'en-US');
  const detailParts = [
    `${resolution.command.name}@${resolution.command.id}`,
    resolution.resolutionType === 'alias' ? 'alias' : resolution.resolutionType === 'qualified' ? 'exact' : 'MRU'
  ];

  if (resolution.command.disabled) {
    detailParts.push('disabled');
  }

  const suffix = description ? ` - ${description}` : '';
  return {
    content: `${resolution.command.name}@${resolution.command.id}${resolution.argvTokens.length > 0 ? ` ${resolution.argvTokens.join(' ')}` : ''}`,
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

function buildPrefixSuggestions(indexCommands, text) {
  const { cmdToken, remainder } = splitInput(text);
  if (!cmdToken || cmdToken.includes('@')) {
    return [];
  }
  return indexCommands
    .filter((entry) => entry.name.startsWith(cmdToken))
    .sort((left, right) => {
      const leftMru = Number.isFinite(left.mruAt) ? left.mruAt : -1;
      const rightMru = Number.isFinite(right.mruAt) ? right.mruAt : -1;
      if (leftMru !== rightMru) {
        return rightMru - leftMru;
      }
      return right.updatedAt - left.updatedAt;
    })
    .slice(0, 6)
    .map((entry) => {
      const description = resolveLocalizedText(entry.description, 'en-US');
      const parts = [`${entry.name}@${entry.id}`];
      if (entry.disabled) {
        parts.push('disabled');
      }
      if (description) {
        parts.push(description);
      }
      return {
        content: `${entry.name}@${entry.id}${remainder}`,
        description: escapeHtml(parts.join(' · '))
      };
    });
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
  const resolution = await resolveInvocationInput(trimmed);
  if (resolution.ok) {
    const suggestions = [buildResolvedSuggestion(resolution)];
    const helpSuggestion = buildHelpSuggestion(resolution);
    if (helpSuggestion) {
      suggestions.push(helpSuggestion);
    }
    return suggestions;
  }

  const prefixSuggestions = buildPrefixSuggestions(state.indexCommands, trimmed);
  if (prefixSuggestions.length > 0) {
    return prefixSuggestions;
  }

  return [{
    content: trimmed,
    description: formatNoSuchCommandSuggestion(trimmed)
  }];
}
