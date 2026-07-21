export const SORT_ASCENDING = 'asc';
export const SORT_DESCENDING = 'desc';

export function normalizeSortDirection(direction, fallback = SORT_ASCENDING) {
  return direction === SORT_DESCENDING || direction === SORT_ASCENDING ? direction : fallback;
}

export function toggleSortDirection(direction) {
  return normalizeSortDirection(direction) === SORT_ASCENDING ? SORT_DESCENDING : SORT_ASCENDING;
}

export function getSortDirectionMultiplier(direction) {
  return normalizeSortDirection(direction) === SORT_ASCENDING ? 1 : -1;
}

export function getSortDirectionIconName(sortKey, direction) {
  const normalizedDirection = normalizeSortDirection(direction);
  if (sortKey === 'updatedAt') {
    return normalizedDirection === SORT_ASCENDING ? 'arrowDown19' : 'arrowUp91';
  }
  return normalizedDirection === SORT_ASCENDING ? 'arrowDownAZ' : 'arrowUpZA';
}

export function compareCommandValues(left, right, sortKey = 'name') {
  if (sortKey === 'name') {
    return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  }
  if (sortKey === 'id') {
    return left.id.localeCompare(right.id) || left.name.localeCompare(right.name);
  }
  return (left.updatedAt || 0) - (right.updatedAt || 0) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

export function itemMatchesTextFilter(item, filterText, getValues) {
  const query = String(filterText || '').trim().toLowerCase();
  if (!query) {
    return true;
  }
  return getValues(item).some((value) => String(value).toLowerCase().includes(query));
}

export function filterListItems(items, filterText, getValues) {
  return items.filter((item) => itemMatchesTextFilter(item, filterText, getValues));
}

export function sortListItems(items, compareItems, direction = SORT_ASCENDING) {
  const multiplier = getSortDirectionMultiplier(direction);
  return [...items].sort((left, right) => compareItems(left, right) * multiplier);
}

export function filterAndSortListItems(items, {
  filterText = '',
  getFilterValues,
  compareItems,
  direction = SORT_ASCENDING
}) {
  const filtered = getFilterValues
    ? filterListItems(items, filterText, getFilterValues)
    : [...items];
  return compareItems
    ? sortListItems(filtered, compareItems, direction)
    : filtered;
}
