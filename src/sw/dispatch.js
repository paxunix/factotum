import {
  getAliasMap,
  getCommand,
  listCommandIndex,
  updateCommandMru
} from './storage.js';
import { formatNoSuchCommandSuggestion, resolveCommand } from './omnibox.js';

export async function resolveInvocationInput(text) {
  const [indexCommands, aliases] = await Promise.all([
    listCommandIndex(),
    getAliasMap()
  ]);

  const resolution = resolveCommand(indexCommands, aliases, text);
  if (!resolution.ok) {
    return resolution;
  }

  const fullCommand = await getCommand(resolution.command.name, resolution.command.id);
  return {
    ...resolution,
    command: fullCommand || resolution.command
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

export async function getOmniboxSuggestions(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return [];
  }

  const resolution = await resolveInvocationInput(trimmed);
  if (resolution.ok) {
    return [];
  }

  return [
    {
      content: trimmed,
      description: formatNoSuchCommandSuggestion(trimmed)
    }
  ];
}
