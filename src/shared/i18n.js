export function getMessage(key, fallback = key, substitutions) {
  try {
    return chrome?.i18n?.getMessage?.(key, substitutions) || fallback;
  } catch {
    return fallback;
  }
}

export function formatMessage(key, fallback, substitutions, placeholders = ['$COUNT$', '$COMMAND$']) {
  const values = Array.isArray(substitutions) ? substitutions.map(String) : [String(substitutions)];
  let message = getMessage(key, fallback, values);
  for (const placeholder of placeholders) {
    message = message.replace(placeholder, values[0]);
  }
  return message;
}
