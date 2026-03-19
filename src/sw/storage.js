import {
  normalizeAliasMap,
  normalizeCommandRecord,
  normalizeLocalizedText,
  validateAliasKey,
  validateCommandId,
  validateCommandName
} from './validation.js';

export const INDEX_KEY = 'fcmd:index';
export const ALIASES_KEY = 'fcmd:aliases';
const INDEX_SCHEMA_VERSION = 1;

function commandStorageKey(name, id) {
  return `fcmd:cmd:${name}@${id}`;
}

function emptyIndexRecord() {
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    commands: []
  };
}

function mergeIndexEntry(commands, entry) {
  const next = commands.filter((item) => !(item.name === entry.name && item.id === entry.id));
  next.push(entry);
  return next;
}

function toIndexEntry(command, previousEntry) {
  return {
    name: command.name,
    id: command.id,
    world: command.world,
    updatedAt: command.updatedAt,
    disabled: Boolean(command.disabled),
    ...(Number.isFinite(previousEntry?.mruAt) ? { mruAt: previousEntry.mruAt } : {}),
    ...(command.description ? { description: normalizeLocalizedText(command.description) } : {})
  };
}

export function resolveLocalizedText(value, locale = 'en-US') {
  const localized = normalizeLocalizedText(value);
  if (!localized) {
    return '';
  }

  const entries = Object.entries(localized);
  const preferred = String(locale || 'en-US').toLowerCase();
  const primary = preferred.split('-')[0];

  for (const [key, text] of entries) {
    if (key.toLowerCase() === preferred) {
      return text;
    }
  }

  for (const [key, text] of entries) {
    if (key.toLowerCase().split('-')[0] === primary) {
      return text;
    }
  }

  for (const [key, text] of entries) {
    if (key.toLowerCase() === 'en-us') {
      return text;
    }
  }

  return entries[0][1];
}

async function getMany(keys) {
  return chrome.storage.local.get(keys);
}

async function setMany(values) {
  return chrome.storage.local.set(values);
}

export async function getIndexRecord() {
  const result = await getMany([INDEX_KEY]);
  const index = result[INDEX_KEY];
  if (!index || typeof index !== 'object' || !Array.isArray(index.commands)) {
    return emptyIndexRecord();
  }

  return {
    schemaVersion: index.schemaVersion === 1 ? 1 : INDEX_SCHEMA_VERSION,
    commands: index.commands.map((entry) => ({
      name: validateCommandName(entry.name),
      id: validateCommandId(entry.id),
      world: entry.world === 'user_script' ? entry.world : 'user_script',
      updatedAt: entry.updatedAt,
      ...(entry.description ? { description: normalizeLocalizedText(entry.description) } : {}),
      ...(entry.disabled != null ? { disabled: Boolean(entry.disabled) } : {}),
      ...(Number.isFinite(entry.mruAt) ? { mruAt: entry.mruAt } : {})
    }))
  };
}

export async function getAliasMap() {
  const result = await getMany([ALIASES_KEY]);
  return normalizeAliasMap(result[ALIASES_KEY]);
}

export async function listCommandIndex() {
  const index = await getIndexRecord();
  return [...index.commands];
}

export async function listCommands() {
  const index = await getIndexRecord();
  if (index.commands.length === 0) {
    return [];
  }

  const keys = index.commands.map((entry) => commandStorageKey(entry.name, entry.id));
  const result = await getMany(keys);
  return index.commands
    .map((entry) => result[commandStorageKey(entry.name, entry.id)])
    .filter(Boolean)
    .map((record) => normalizeCommandRecord(record));
}

export async function getCommand(name, id) {
  const key = commandStorageKey(validateCommandName(name), validateCommandId(id));
  const result = await getMany([key]);
  return result[key] ? normalizeCommandRecord(result[key]) : null;
}

export async function saveCommand(record, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const normalized = normalizeCommandRecord(record, now);
  const key = commandStorageKey(normalized.name, normalized.id);
  const index = await getIndexRecord();
  const existing = index.commands.find((entry) => entry.name === normalized.name && entry.id === normalized.id);
  const nextIndex = {
    schemaVersion: INDEX_SCHEMA_VERSION,
    commands: mergeIndexEntry(index.commands, toIndexEntry(normalized, existing))
  };

  await setMany({
    [INDEX_KEY]: nextIndex,
    [key]: normalized
  });

  return normalized;
}

export async function updateCommandMru(name, id, mruAt = Date.now()) {
  validateCommandName(name);
  validateCommandId(id);

  const index = await getIndexRecord();
  let changed = false;
  const commands = index.commands.map((entry) => {
    if (entry.name === name && entry.id === id) {
      changed = true;
      return { ...entry, mruAt };
    }
    return entry;
  });

  if (!changed) {
    return false;
  }

  await setMany({
    [INDEX_KEY]: {
      schemaVersion: INDEX_SCHEMA_VERSION,
      commands
    }
  });

  return true;
}

export async function setAliases(aliases) {
  const normalized = normalizeAliasMap(aliases);
  await setMany({ [ALIASES_KEY]: normalized });
  return normalized;
}

export async function exportBundle() {
  const commands = await listCommands();
  const aliases = await getAliasMap();

  return {
    bundleSchemaVersion: 1,
    exportedAt: Date.now(),
    commands,
    aliases
  };
}

export async function importBundle(bundle, options = {}) {
  if (!bundle || typeof bundle !== 'object') {
    throw Object.assign(new Error('Import bundle must be an object'), { code: 'INVALID_BUNDLE' });
  }

  if (bundle.bundleSchemaVersion !== 1) {
    throw Object.assign(new Error(`Unsupported bundle schema version: ${String(bundle.bundleSchemaVersion)}`), { code: 'INVALID_BUNDLE' });
  }

  const aliasMode = options.aliasMode === 'overwrite' ? 'overwrite' : 'skip';
  const warnings = [];
  const importedCommands = [];
  const incomingAliases = normalizeAliasMap(bundle.aliases);
  const existingAliases = await getAliasMap();
  const incomingCommands = Array.isArray(bundle.commands) ? bundle.commands : [];
  const seenKeys = new Set();

  for (const command of incomingCommands) {
    const normalized = normalizeCommandRecord(command);
    const key = `${normalized.name}@${normalized.id}`;

    if (seenKeys.has(key)) {
      warnings.push({ code: 'DUPLICATE_COMMAND', key, message: `Duplicate command in import bundle: ${key}` });
    }
    seenKeys.add(key);

    const existing = await getCommand(normalized.name, normalized.id);
    if (existing) {
      warnings.push({ code: 'DUPLICATE_COMMAND', key, message: `Overwriting installed command: ${key}` });
    }

    importedCommands.push(await saveCommand(normalized));
  }

  const nextAliases = { ...existingAliases };
  for (const [alias, target] of Object.entries(incomingAliases)) {
    validateAliasKey(alias);
    if (nextAliases[alias] && aliasMode === 'skip') {
      warnings.push({ code: 'ALIAS_COLLISION', alias, message: `Skipping alias collision: ${alias}` });
      continue;
    }
    nextAliases[alias] = target;
  }

  await setAliases(nextAliases);

  return {
    importedCommands,
    aliases: nextAliases,
    warnings
  };
}
