import shellQuote from 'shell-quote';

const { parse: shellQuoteParse } = shellQuote;

const MATCH_KIND_ORDER = {
  'exact-name': 0,
  'exact-alias': 1,
  'prefix-name': 2,
  'prefix-alias': 3
};

function normalizeShellQuoteTokens(parsedTokens) {
  const tokens = [];

  for (const token of parsedTokens) {
    if (typeof token === 'string') {
      tokens.push(token);
      continue;
    }

    if (token && typeof token === 'object' && typeof token.op === 'string') {
      tokens.push(token.op);
      continue;
    }

    if (token && typeof token === 'object' && typeof token.comment === 'string') {
      break;
    }

    if (token != null) {
      tokens.push(String(token));
    }
  }

  return tokens;
}

function splitCommandToken(token) {
  const atIndex = token.indexOf('@');
  if (atIndex < 0) {
    return null;
  }

  return {
    name: token.slice(0, atIndex),
    id: token.slice(atIndex + 1)
  };
}

function commandRefKey(command) {
  return `${command.name}@${command.id}`;
}

function compareCommands(left, right) {
  const leftMru = Number.isFinite(left.mruAt) ? left.mruAt : -1;
  const rightMru = Number.isFinite(right.mruAt) ? right.mruAt : -1;
  if (leftMru !== rightMru) {
    return rightMru - leftMru;
  }

  const leftUpdated = Number.isFinite(left.updatedAt) ? left.updatedAt : -1;
  const rightUpdated = Number.isFinite(right.updatedAt) ? right.updatedAt : -1;
  if (leftUpdated !== rightUpdated) {
    return rightUpdated - leftUpdated;
  }

  const leftName = String(left.name || '');
  const rightName = String(right.name || '');
  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return String(left.id || '').localeCompare(String(right.id || ''));
}

function addCandidate(candidateMap, command, matchKind, matchedAlias = null) {
  const key = commandRefKey(command);
  const nextRank = MATCH_KIND_ORDER[matchKind];
  const existing = candidateMap.get(key);
  if (!existing || nextRank < MATCH_KIND_ORDER[existing.matchKind]) {
    candidateMap.set(key, { command, matchKind, matchedAlias });
  }
}

export function tokenizeInput(input) {
  const parsed = shellQuoteParse(String(input || ''));
  return normalizeShellQuoteTokens(parsed);
}

export function findCommandCandidates(indexCommands, aliases, cmdToken) {
  const query = String(cmdToken || '').trim().toLowerCase();
  if (!query) {
    return [];
  }

  const enabledCommands = indexCommands.filter((entry) => !entry.disabled);
  const commandsByKey = new Map(enabledCommands.map((command) => [commandRefKey(command), command]));
  const candidateMap = new Map();

  for (const command of enabledCommands) {
    const name = command.name.toLowerCase();
    if (name === query) {
      addCandidate(candidateMap, command, 'exact-name');
      continue;
    }
    if (name.startsWith(query)) {
      addCandidate(candidateMap, command, 'prefix-name');
    }
  }

  for (const [alias, targets] of Object.entries(aliases)) {
    const aliasLower = alias.toLowerCase();
    let matchKind = null;
    if (aliasLower === query) {
      matchKind = 'exact-alias';
    } else if (aliasLower.startsWith(query)) {
      matchKind = 'prefix-alias';
    }
    if (!matchKind) {
      continue;
    }

    for (const target of Array.isArray(targets) ? targets : []) {
      const command = commandsByKey.get(commandRefKey(target));
      if (!command) {
        continue;
      }
      addCandidate(candidateMap, command, matchKind, alias);
    }
  }

  return [...candidateMap.values()].sort((left, right) => {
    const leftRank = MATCH_KIND_ORDER[left.matchKind];
    const rightRank = MATCH_KIND_ORDER[right.matchKind];
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return compareCommands(left.command, right.command);
  });
}

export function resolveCommand(indexCommands, aliases, input) {
  const rawTokens = tokenizeInput(input);
  if (rawTokens.length === 0) {
    return {
      ok: false,
      code: 'EMPTY_INPUT',
      message: ''
    };
  }

  const [initialCmdToken, ...argvTokens] = rawTokens;
  const qualifiedRef = splitCommandToken(initialCmdToken);
  if (qualifiedRef) {
    const command = indexCommands.find((entry) => !entry.disabled && entry.name === qualifiedRef.name && entry.id === qualifiedRef.id);
    if (command) {
      return {
        ok: true,
        command,
        cmdToken: initialCmdToken,
        effectiveCmdToken: commandRefKey(command),
        argvTokens,
        rawTokens,
        resolutionType: 'qualified',
        candidates: [{
          command,
          matchKind: 'qualified',
          matchedAlias: null
        }]
      };
    }
  }

  const candidates = findCommandCandidates(indexCommands, aliases, initialCmdToken);
  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'NO_SUCH_COMMAND',
      message: `No such command: ${initialCmdToken}`,
      cmdToken: initialCmdToken,
      argvTokens,
      rawTokens
    };
  }

  const selectedCandidate = candidates[0];
  return {
    ok: true,
    command: selectedCandidate.command,
    cmdToken: initialCmdToken,
    effectiveCmdToken: commandRefKey(selectedCandidate.command),
    argvTokens,
    rawTokens,
    resolutionType: selectedCandidate.matchKind,
    candidates
  };
}

export function formatNoSuchCommandSuggestion(text) {
  return `No such command: ${text}`;
}
