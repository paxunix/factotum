import shellQuote from 'shell-quote';

const { parse: shellQuoteParse } = shellQuote;

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

export function tokenizeInput(input) {
  const parsed = shellQuoteParse(String(input || ''));
  return normalizeShellQuoteTokens(parsed);
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

function sortCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const leftMru = Number.isFinite(left.mruAt) ? left.mruAt : -1;
    const rightMru = Number.isFinite(right.mruAt) ? right.mruAt : -1;
    if (leftMru !== rightMru) {
      return rightMru - leftMru;
    }

    const leftUpdated = Number.isFinite(left.updatedAt) ? left.updatedAt : -1;
    const rightUpdated = Number.isFinite(right.updatedAt) ? right.updatedAt : -1;
    return rightUpdated - leftUpdated;
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
  const aliasTargets = Array.isArray(aliases[initialCmdToken]) ? aliases[initialCmdToken] : null;
  const parsedRef = splitCommandToken(initialCmdToken);

  let matches;
  let resolutionType;

  if (aliasTargets && aliasTargets.length > 0) {
    matches = sortCandidates(indexCommands.filter((entry) => aliasTargets.some((target) => entry.name === target.name && entry.id === target.id) && !entry.disabled));
    resolutionType = 'alias';
  } else if (parsedRef) {
    matches = sortCandidates(indexCommands.filter((entry) => entry.name === parsedRef.name && entry.id === parsedRef.id));
    resolutionType = 'qualified';
  } else {
    matches = sortCandidates(indexCommands.filter((entry) => entry.name === initialCmdToken && !entry.disabled));
    resolutionType = 'bare';
  }

  if (!matches || matches.length === 0) {
    return {
      ok: false,
      code: 'NO_SUCH_COMMAND',
      message: `No such command: ${initialCmdToken}`,
      cmdToken: initialCmdToken,
      argvTokens,
      rawTokens
    };
  }

  const command = matches[0];
  return {
    ok: true,
    command,
    cmdToken: initialCmdToken,
    effectiveCmdToken: `${command.name}@${command.id}`,
    argvTokens,
    rawTokens,
    resolutionType
  };
}

export function formatNoSuchCommandSuggestion(text) {
  return `No such command: ${text}`;
}
