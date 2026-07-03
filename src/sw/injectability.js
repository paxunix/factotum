export function isInjectableUrl(url) {
  return typeof url === 'string' && /^(https?|file):/i.test(url);
}
