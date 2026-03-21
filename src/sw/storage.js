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
const INVALID_COMMAND_MESSAGE = 'Command is quarantined because stored data is invalid.';

function assertStorage(condition, message, code = 'INVALID_BUNDLE') {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

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

function serializeValidationError(error, fallbackMessage = INVALID_COMMAND_MESSAGE) {
  return {
    code: error?.code || 'INVALID_COMMAND',
    message: error?.message || fallbackMessage
  };
}

function sanitizeIndexWorld(world) {
  return typeof world === 'string' && world.length > 0 ? world : 'user_script';
}

function normalizeLocalizedTextBestEffort(value) {
  try {
    return normalizeLocalizedText(value);
  } catch {
    return undefined;
  }
}

function toRawIndexEntry(record, previousEntry, fallback = {}) {
  const name = validateCommandName(fallback.name ?? record?.name);
  const id = validateCommandId(fallback.id ?? record?.id);
  const description = normalizeLocalizedTextBestEffort(record?.description)
    || normalizeLocalizedTextBestEffort(previousEntry?.description);

  return {
    name,
    id,
    world: sanitizeIndexWorld(record?.world ?? previousEntry?.world),
    updatedAt: Number.isFinite(record?.updatedAt) ? record.updatedAt : Number.isFinite(previousEntry?.updatedAt) ? previousEntry.updatedAt : Date.now(),
    disabled: Boolean(record?.disabled ?? previousEntry?.disabled),
    ...(Number.isFinite(previousEntry?.mruAt) ? { mruAt: previousEntry.mruAt } : {}),
    ...(description ? { description } : {})
  };
}

function toQuarantinedEntry(indexEntry, rawRecord, error) {
  const validationError = serializeValidationError(error);
  return {
    ...toRawIndexEntry(rawRecord, indexEntry, indexEntry),
    invalid: true,
    validationError,
    rawRecord
  };
}

async function readStoredCommands() {
  const index = await getIndexRecord();
  if (index.commands.length === 0) {
    return {
      indexEntries: [],
      validCommands: [],
      invalidCommands: []
    };
  }

  const keys = index.commands.map((entry) => commandStorageKey(entry.name, entry.id));
  const result = await getMany(keys);
  const indexEntries = [];
  const validCommands = [];
  const invalidCommands = [];

  for (const entry of index.commands) {
    const rawRecord = result[commandStorageKey(entry.name, entry.id)];
    if (!rawRecord || typeof rawRecord !== 'object') {
      invalidCommands.push(toQuarantinedEntry(entry, {
        name: entry.name,
        id: entry.id,
        world: entry.world,
        updatedAt: entry.updatedAt,
        disabled: entry.disabled,
        description: entry.description
      }, Object.assign(new Error(`Missing stored command record: ${entry.name}@${entry.id}`), { code: 'MISSING_COMMAND_RECORD' })));
      indexEntries.push({
        ...entry,
        invalid: true,
        validationError: {
          code: 'MISSING_COMMAND_RECORD',
          message: `Missing stored command record: ${entry.name}@${entry.id}`
        }
      });
      continue;
    }

    try {
      const normalized = normalizeCommandRecord(rawRecord);
      validCommands.push(normalized);
      indexEntries.push(toIndexEntry(normalized, entry));
    } catch (error) {
      const quarantined = toQuarantinedEntry(entry, rawRecord, error);
      invalidCommands.push(quarantined);
      indexEntries.push({
        ...quarantined,
        rawRecord: undefined
      });
    }
  }

  return {
    indexEntries,
    validCommands,
    invalidCommands
  };
}

async function saveRawCommandRecord(record, options = {}) {
  const name = validateCommandName(options.name ?? record?.name);
  const id = validateCommandId(options.id ?? record?.id);
  const key = commandStorageKey(name, id);
  const index = await getIndexRecord();
  const existing = index.commands.find((entry) => entry.name === name && entry.id === id);
  const nextIndex = {
    schemaVersion: INDEX_SCHEMA_VERSION,
    commands: mergeIndexEntry(index.commands, toRawIndexEntry(record, existing, { name, id }))
  };

  await setMany({
    [INDEX_KEY]: nextIndex,
    [key]: record
  });
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
      world: sanitizeIndexWorld(entry.world),
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

export async function listCommandIndex(options = {}) {
  const snapshot = await readStoredCommands();
  return options.includeInvalid ? snapshot.indexEntries : snapshot.indexEntries.filter((entry) => !entry.invalid);
}

export async function listCommands() {
  const snapshot = await readStoredCommands();
  return snapshot.validCommands;
}

export async function getCommand(name, id, options = {}) {
  const key = commandStorageKey(validateCommandName(name), validateCommandId(id));
  const result = await getMany([key]);
  if (!result[key]) {
    return null;
  }

  try {
    return normalizeCommandRecord(result[key]);
  } catch (error) {
    if (!options.allowInvalid) {
      return null;
    }
    return {
      ...toQuarantinedEntry({ name, id }, result[key], error)
    };
  }
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
  const snapshot = await readStoredCommands();
  const aliases = await getAliasMap();

  return {
    bundleSchemaVersion: 1,
    exportedAt: Date.now(),
    commands: snapshot.validCommands,
    ...(snapshot.invalidCommands.length > 0 ? {
      invalidCommands: snapshot.invalidCommands.map((entry) => ({
        name: entry.name,
        id: entry.id,
        validationError: entry.validationError,
        command: entry.rawRecord
      }))
    } : {}),
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
  let quarantinedCommands = 0;
  const incomingAliases = normalizeAliasMap(bundle.aliases);
  const existingAliases = await getAliasMap();
  const incomingCommands = Array.isArray(bundle.commands) ? bundle.commands : [];
  const incomingInvalidCommands = Array.isArray(bundle.invalidCommands) ? bundle.invalidCommands : [];
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

  for (const entry of incomingInvalidCommands) {
    assertStorage(entry && typeof entry === 'object', 'Invalid command bundle entry must be an object', 'INVALID_BUNDLE');
    assertStorage(entry.command && typeof entry.command === 'object', 'Invalid command bundle entry must include a command object', 'INVALID_BUNDLE');

    const name = validateCommandName(entry.name ?? entry.command.name);
    const id = validateCommandId(entry.id ?? entry.command.id);
    const key = `${name}@${id}`;

    if (seenKeys.has(key)) {
      warnings.push({ code: 'DUPLICATE_INVALID_COMMAND', key, message: `Duplicate invalid command in import bundle: ${key}` });
    }
    seenKeys.add(key);

    const existing = await getCommand(name, id, { allowInvalid: true });
    if (existing) {
      warnings.push({ code: 'DUPLICATE_COMMAND', key, message: `Overwriting installed or quarantined command: ${key}` });
    }

    await saveRawCommandRecord(entry.command, { name, id });
    quarantinedCommands += 1;
    const validationMessage = entry.validationError?.message || INVALID_COMMAND_MESSAGE;
    warnings.push({ code: 'INVALID_COMMAND_QUARANTINED', key, message: `Imported invalid command as quarantined: ${key} (${validationMessage})` });
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
    quarantinedCommands,
    aliases: nextAliases,
    warnings
  };
}
