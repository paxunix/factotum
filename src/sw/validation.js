const NAME_RE = /^[A-Za-z0-9_-]+$/;
const ID_RE = /^[A-Za-z0-9._\-/:]+$/;
const ALIAS_RE = /^[A-Za-z0-9_-]+$/;

function assert(condition, message, code = 'VALIDATION_ERROR') {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

export function validateCommandName(name) {
  assert(typeof name === 'string' && NAME_RE.test(name), `Invalid command name: ${String(name)}`, 'INVALID_NAME');
  return name;
}

export function validateCommandId(id) {
  assert(
    typeof id === 'string' && ID_RE.test(id) && !id.includes('@') && !/\s/.test(id),
    `Invalid command id: ${String(id)}`,
    'INVALID_ID'
  );
  return id;
}

export function validateAliasKey(alias) {
  assert(typeof alias === 'string' && ALIAS_RE.test(alias), `Invalid alias key: ${String(alias)}`, 'INVALID_ALIAS');
  return alias;
}

export function validateWorld(world) {
  assert(world === 'user_script', `Invalid world: ${String(world)}`, 'INVALID_WORLD');
  return world;
}

export function normalizeLocalizedText(value) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return { 'en-US': value };
  }

  assert(typeof value === 'object' && !Array.isArray(value), 'Localized text must be a string or object', 'INVALID_LOCALIZED_TEXT');

  const normalized = {};
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === 'string') {
      normalized[key] = text;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeRequireEntry(entry) {
  assert(entry && typeof entry === 'object', 'Require entry must be an object', 'INVALID_REQUIRE');
  assert(typeof entry.url === 'string' && entry.url.length > 0, 'Require url must be a string', 'INVALID_REQUIRE');
  assert(entry.kind === 'script' || entry.kind === 'module', 'Require kind must be script or module', 'INVALID_REQUIRE');

  const world = entry.world == null ? undefined : validateWorld(entry.world);
  assert(!(world === 'user_script' && entry.kind !== 'module'), 'User script requires are allowed only for modules', 'INVALID_REQUIRE');

  return {
    url: entry.url,
    kind: entry.kind,
    ...(world ? { world } : {})
  };
}

function normalizeOptionSpec(option) {
  assert(option && typeof option === 'object', 'Option spec must be an object', 'INVALID_OPTION_SPEC');
  assert(Array.isArray(option.flags) && option.flags.length > 0, 'Option flags must be a non-empty array', 'INVALID_OPTION_SPEC');

  const normalized = {
    flags: option.flags.map((flag) => String(flag))
  };

  if (option.value != null) {
    assert(
      option.value === 'string' || option.value === 'number' || option.value === 'boolean',
      'Option value must be string, number, or boolean',
      'INVALID_OPTION_SPEC'
    );
    normalized.value = option.value;
  }

  if (option.description != null) {
    normalized.description = normalizeLocalizedText(option.description);
  }

  if (option.required != null) {
    normalized.required = Boolean(option.required);
  }

  if (option.default != null) {
    normalized.default = option.default;
  }

  return normalized;
}

function normalizeCommandVersion(version) {
  if (version == null) {
    return '1';
  }
  return String(version);
}

export function normalizeCommandRecord(record, now = Date.now()) {
  assert(record && typeof record === 'object', 'Command record must be an object', 'INVALID_COMMAND');

  const name = validateCommandName(record.name);
  const id = validateCommandId(record.id);
  const world = validateWorld(record.world);
  assert(typeof record.code === 'string', 'Command code must be a string', 'INVALID_COMMAND');
  const version = normalizeCommandVersion(record.version);

  const createdAt = Number.isFinite(record.createdAt) ? record.createdAt : now;
  const updatedAt = Number.isFinite(record.updatedAt) ? record.updatedAt : now;
  const schemaVersion = record.schemaVersion == null ? 1 : record.schemaVersion;

  assert(schemaVersion === 1, `Unsupported schemaVersion: ${String(schemaVersion)}`, 'INVALID_SCHEMA_VERSION');

  const normalized = {
    schemaVersion: 1,
    name,
    id,
    version,
    world,
    disabled: Boolean(record.disabled),
    code: record.code,
    createdAt,
    updatedAt
  };

  const description = normalizeLocalizedText(record.description);
  if (description) {
    normalized.description = description;
  }

  if (Array.isArray(record.requires) && record.requires.length > 0) {
    normalized.requires = record.requires.map(normalizeRequireEntry);
  }

  if (record.helpHtmlTemplate != null) {
    assert(typeof record.helpHtmlTemplate === 'string', 'helpHtmlTemplate must be a string', 'INVALID_COMMAND');
    normalized.helpHtmlTemplate = record.helpHtmlTemplate;
  }

  if (record.helpHtmlStrings != null) {
    assert(typeof record.helpHtmlStrings === 'object' && !Array.isArray(record.helpHtmlStrings), 'helpHtmlStrings must be an object', 'INVALID_COMMAND');
    const strings = {};
    for (const [locale, value] of Object.entries(record.helpHtmlStrings)) {
      const localized = normalizeLocalizedText(value);
      if (localized) {
        strings[locale] = localized;
      }
    }
    if (Object.keys(strings).length > 0) {
      normalized.helpHtmlStrings = strings;
    }
  }

  if (record.optionsSpec != null) {
    assert(typeof record.optionsSpec === 'object' && !Array.isArray(record.optionsSpec), 'optionsSpec must be an object', 'INVALID_OPTION_SPEC');
    const optionSpec = {};
    if (record.optionsSpec.name != null) {
      optionSpec.name = String(record.optionsSpec.name);
    }
    if (record.optionsSpec.args != null) {
      optionSpec.args = String(record.optionsSpec.args);
    }
    if (Array.isArray(record.optionsSpec.options) && record.optionsSpec.options.length > 0) {
      optionSpec.options = record.optionsSpec.options.map(normalizeOptionSpec);
    }
    normalized.optionsSpec = optionSpec;
  }

  return normalized;
}

export function normalizeAliasMap(aliases) {
  const normalized = {};
  if (!aliases || typeof aliases !== 'object') {
    return normalized;
  }

  for (const [alias, rawTargets] of Object.entries(aliases)) {
    validateAliasKey(alias);
    const values = Array.isArray(rawTargets) ? rawTargets : rawTargets ? [rawTargets] : [];
    const seen = new Set();
    const targets = [];
    for (const target of values) {
      assert(target && typeof target === 'object', `Alias target for ${alias} must be an object`, 'INVALID_ALIAS');
      const normalizedTarget = {
        name: validateCommandName(target.name),
        id: validateCommandId(target.id)
      };
      const key = `${normalizedTarget.name}@${normalizedTarget.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      targets.push(normalizedTarget);
    }
    normalized[alias] = targets;
  }

  return normalized;
}
