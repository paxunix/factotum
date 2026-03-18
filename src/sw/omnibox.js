import mri from 'mri';
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

export function parseArgv(argvTokens) {
  return mri(argvTokens);
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
  const aliasTarget = aliases[initialCmdToken];
  const effectiveCmdToken = aliasTarget ? `${aliasTarget.name}@${aliasTarget.id}` : initialCmdToken;
  const parsedRef = splitCommandToken(effectiveCmdToken);

  let matches;
  let resolutionType;

  if (parsedRef) {
    matches = sortCandidates(indexCommands.filter((entry) => entry.name === parsedRef.name && entry.id === parsedRef.id));
    resolutionType = aliasTarget ? 'alias' : 'qualified';
  } else {
    matches = sortCandidates(indexCommands.filter((entry) => entry.name === effectiveCmdToken && !entry.disabled));
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
    effectiveCmdToken,
    argvTokens,
    rawTokens,
    parsedOpts: parseArgv(argvTokens),
    resolutionType
  };
}

export function formatNoSuchCommandSuggestion(text) {
  return `No such command: ${text}`;
}
