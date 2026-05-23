import mri from 'mri';

function flagName(flag) {
  if (typeof flag !== 'string') {
    return '';
  }
  if (flag.startsWith('--')) {
    return flag.slice(2);
  }
  if (flag.startsWith('-')) {
    return flag.slice(1);
  }
  return flag;
}

function canonicalOptionName(option) {
  const flags = Array.isArray(option?.flags) ? option.flags.map(String) : [];
  const longFlag = flags.find((flag) => flag.startsWith('--'));
  return flagName(longFlag || flags[0]);
}

function buildMriConfig(optionsSpec = {}) {
  const declaredOptions = Array.isArray(optionsSpec.options) ? optionsSpec.options : [];
  const alias = { help: ['h'], debug: [] };
  const boolean = ['help', 'debug'];
  const string = [];
  const number = [];
  const defaults = {};
  const required = new Set();
  const canonicalNames = new Set(['help', 'debug']);

  for (const option of declaredOptions) {
    const flags = Array.isArray(option.flags) ? option.flags.map(String) : [];
    const canonical = canonicalOptionName(option);
    if (!canonical) {
      continue;
    }

    canonicalNames.add(canonical);
    alias[canonical] = flags
      .map(flagName)
      .filter((name) => name && name !== canonical);

    for (const flag of flags) {
      const name = flagName(flag);
      if (name && name !== canonical) {
        alias[name] = canonical;
      }
    }

    if (option.value === 'string') {
      string.push(canonical);
    } else if (option.value === 'number') {
      number.push(canonical);
    } else {
      boolean.push(canonical);
    }

    if (option.default != null) {
      defaults[canonical] = option.default;
    }

    if (option.required) {
      required.add(canonical);
    }
  }

  return {
    alias,
    boolean,
    canonicalNames,
    closed: declaredOptions.length > 0,
    default: defaults,
    number,
    required,
    string
  };
}

function hasOptionValue(parsed, name) {
  return Object.prototype.hasOwnProperty.call(parsed, name)
    && parsed[name] !== undefined
    && parsed[name] !== null
    && parsed[name] !== false
    && parsed[name] !== '';
}

function toPublicOptions(parsed, config) {
  const options = {};
  for (const name of config.canonicalNames) {
    if (Object.prototype.hasOwnProperty.call(parsed, name)) {
      options[name] = parsed[name];
    }
  }
  return options;
}

export function parseCommandArgv(argvTokens, optionsSpec = {}) {
  const tokens = Array.isArray(argvTokens) ? argvTokens.map(String) : [];
  const config = buildMriConfig(optionsSpec);
  let unknown = '';
  const parsed = mri(tokens, {
    alias: config.alias,
    boolean: config.boolean,
    default: config.default,
    number: config.number,
    string: config.string,
    ...(config.closed ? {
      unknown(arg) {
        unknown = String(arg);
        return false;
      }
    } : {})
  });

  if (parsed === false) {
    throw Object.assign(new Error(`Unknown option: ${unknown || 'unknown option'}`), {
      code: 'UNKNOWN_OPTION',
      option: unknown || undefined
    });
  }

  for (const name of config.required) {
    if (!hasOptionValue(parsed, name)) {
      throw Object.assign(new Error(`Missing required option: ${name}`), {
        code: 'MISSING_REQUIRED_OPTION',
        option: name
      });
    }
  }

  return {
    tokens,
    positionals: Array.isArray(parsed._) ? parsed._ : [],
    options: toPublicOptions(parsed, config)
  };
}
