import { escapeHtml } from './html.js';

export const RUNTIME_HELP_TEMPLATE_TOKENS = new Set(['usage', 'options', 'args']);
export const DEFAULT_HELP_TEMPLATE = '<h1>{{title}}</h1><pre>{{usage}}</pre>{{options}}{{args}}';

export function resolveLocaleMapEntry(map, locale = 'en-US') {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return undefined;
  }

  const entries = Object.entries(map);
  if (entries.length === 0) {
    return undefined;
  }

  const preferred = String(locale || 'en-US').toLowerCase();
  const primary = preferred.split('-')[0];

  for (const [key, value] of entries) {
    if (key.toLowerCase() === preferred) {
      return value;
    }
  }

  for (const [key, value] of entries) {
    if (key.toLowerCase().split('-')[0] === primary) {
      return value;
    }
  }

  for (const [key, value] of entries) {
    if (key.toLowerCase() === 'en-us') {
      return value;
    }
  }

  return entries[0][1];
}

export function buildHelpUsage(command) {
  const optionsSpec = command.optionsSpec || {};
  const displayName = optionsSpec.name || command.name;
  const optionSynopsis = (optionsSpec.options || [])
    .map((option) => {
      const longFlag = option.flags.find((flag) => flag.startsWith('--')) || option.flags[0];
      return longFlag ? `[${longFlag}]` : '';
    })
    .filter(Boolean)
    .join(' ');
  const args = optionsSpec.args ? ` ${optionsSpec.args}` : '';

  return `${displayName}${optionSynopsis ? ` ${optionSynopsis}` : ''}${args}`;
}

export function buildHelpOptions(command, locale) {
  const options = command.optionsSpec?.options || [];
  if (options.length === 0) {
    return '';
  }

  const items = options.map((option) => {
    const flags = option.flags.map((flag) => `<code>${escapeHtml(flag)}</code>`).join(', ');
    const description = resolveLocaleMapEntry(option.description, locale);
    return `<li>${flags}${description ? ` ${escapeHtml(description)}` : ''}</li>`;
  }).join('');

  return `<ul>${items}</ul>`;
}

export function buildHelpArgs(command) {
  if (!command.optionsSpec?.args) {
    return '';
  }

  return `<p><code>${escapeHtml(command.optionsSpec.args)}</code></p>`;
}

export function renderHelpTemplate(template, tokens) {
  return String(template || '').replace(/{{\s*([A-Za-z0-9_-]+)\s*}}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(tokens, token) ? String(tokens[token] ?? '') : '';
  });
}

export function buildHelpHtml(command, locale) {
  const localizedTokens = resolveLocaleMapEntry(command.helpHtmlStrings, locale);
  const tokens = localizedTokens && typeof localizedTokens === 'object' && !Array.isArray(localizedTokens)
    ? Object.fromEntries(
        Object.entries(localizedTokens).map(([token, value]) => [token, escapeHtml(String(value ?? ''))])
      )
    : {};

  tokens.usage = escapeHtml(buildHelpUsage(command));
  tokens.options = buildHelpOptions(command, locale);
  tokens.args = buildHelpArgs(command);

  const template = command.helpHtmlTemplate || DEFAULT_HELP_TEMPLATE;
  return renderHelpTemplate(template, tokens);
}
