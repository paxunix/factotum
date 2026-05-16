if (!Array.isArray(window.__FACTOTUM_REQUIRE_ORDER) || window.__FACTOTUM_REQUIRE_ORDER[0] !== 'a') {
  throw new Error('require-b loaded before require-a');
}
window.__FACTOTUM_REQUIRE_ORDER.push('b');
