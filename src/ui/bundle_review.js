import {
  SORT_ASCENDING,
  compareCommandValues,
  filterAndSortListItems,
  itemMatchesTextFilter
} from './list_controls.js';

export const DEFAULT_BUNDLE_REVIEW_SORT_STATE = {
  commandsSortKey: 'name',
  commandsSortDirection: SORT_ASCENDING,
  aliasesSortKey: 'alias',
  aliasesSortDirection: SORT_ASCENDING
};

export function commandRefKey(commandRef) {
  return `${commandRef.name}@${commandRef.id}`;
}

export function commandRecordsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function determineReviewState(existingEntry, incomingRecord, incomingInvalid = false) {
  if (!existingEntry) {
    return 'new';
  }

  if (incomingInvalid) {
    if (existingEntry.invalid) {
      return commandRecordsMatch(existingEntry.rawRecord || {}, incomingRecord) ? 'same' : 'overwrite-invalid';
    }
    return 'overwrite-valid';
  }

  if (existingEntry.invalid) {
    return 'overwrite-invalid';
  }

  return commandRecordsMatch(existingEntry.record, incomingRecord) ? 'same' : 'overwrite';
}

export function aliasTargetsMatch(left, right) {
  const normalizeTargets = (targets) => (Array.isArray(targets) ? targets : [])
    .map((target) => commandRefKey(target))
    .sort((a, b) => a.localeCompare(b));
  return JSON.stringify(normalizeTargets(left)) === JSON.stringify(normalizeTargets(right));
}

export function buildBundleAliasesByCommand(aliases, normalizeAliasMap) {
  const map = new Map();
  for (const [alias, targets] of Object.entries(normalizeAliasMap(aliases))) {
    for (const target of targets) {
      const key = commandRefKey(target);
      const existing = map.get(key) || [];
      existing.push(alias);
      map.set(key, existing);
    }
  }
  for (const aliasesForKey of map.values()) {
    aliasesForKey.sort((left, right) => left.localeCompare(right));
  }
  return map;
}

export function buildBundleReviewCommandItems({
  bundle,
  installedEntriesByKey,
  aliasesByCommand,
  normalizeCommandRecord,
  resolveDescription
}) {
  return (Array.isArray(bundle.commands) ? bundle.commands : []).map((command) => {
    const normalized = normalizeCommandRecord(command);
    const key = commandRefKey(normalized);
    const existing = installedEntriesByKey.get(key) || null;
    const state = determineReviewState(existing, normalized, false);
    return {
      kind: 'command',
      key,
      command: normalized,
      title: key,
      detail: normalized.description ? resolveDescription(normalized.description) : '',
      aliases: aliasesByCommand.get(key) || [],
      state,
      selected: true
    };
  });
}

export function buildBundleReviewInvalidItems({
  bundle,
  installedEntriesByKey,
  aliasesByCommand,
  invalidDescription
}) {
  return (Array.isArray(bundle.invalidCommands) ? bundle.invalidCommands : []).map((entry) => {
    const name = String(entry?.name ?? entry?.command?.name ?? '');
    const id = String(entry?.id ?? entry?.command?.id ?? '');
    const key = `${name}@${id}`;
    const existing = installedEntriesByKey.get(key) || null;
    const incomingRaw = entry?.command && typeof entry.command === 'object' ? entry.command : {};
    const state = determineReviewState(existing, incomingRaw, true);
    return {
      kind: 'invalid',
      key,
      entry: {
        name,
        id,
        validationError: entry?.validationError,
        command: incomingRaw
      },
      title: key,
      detail: entry?.validationError?.message || invalidDescription,
      aliases: aliasesByCommand.get(key) || [],
      state,
      selected: true
    };
  });
}

export function buildBundleReviewAliasItems({ bundle, installedAliases, normalizeAliasMap }) {
  return Object.entries(normalizeAliasMap(bundle.aliases)).map(([alias, targets]) => {
    const existingTargets = (installedAliases || {})[alias] || null;
    const state = !existingTargets
      ? 'new'
      : aliasTargetsMatch(existingTargets, targets)
        ? 'same'
        : 'overwrite';
    const detail = (Array.isArray(targets) ? targets : [])
      .map((target) => commandRefKey(target))
      .join(', ');
    return {
      kind: 'alias',
      key: alias,
      alias,
      targets,
      title: alias,
      detail,
      state,
      selected: true
    };
  });
}

export function buildBundleReviewModel({
  bundle,
  installedEntries = [],
  installedAliases = {},
  normalizeAliasMap,
  normalizeCommandRecord,
  resolveDescription,
  invalidDescription
}) {
  const aliasesByCommand = buildBundleAliasesByCommand(bundle.aliases, normalizeAliasMap);
  const installedEntriesByKey = new Map(installedEntries.map((entry) => [entry.key, entry]));
  return {
    bundle,
    commands: buildBundleReviewCommandItems({
      bundle,
      installedEntriesByKey,
      aliasesByCommand,
      normalizeCommandRecord,
      resolveDescription
    }),
    invalidCommands: buildBundleReviewInvalidItems({
      bundle,
      installedEntriesByKey,
      aliasesByCommand,
      invalidDescription
    }),
    aliases: buildBundleReviewAliasItems({
      bundle,
      installedAliases,
      normalizeAliasMap
    })
  };
}

export function getBundleReviewFilterValues(item) {
  const values = [item.title, item.detail || ''];
  if (item.kind === 'command') {
    values.push(item.command.name, item.command.id, commandRefKey(item.command), ...(item.aliases || []));
  } else if (item.kind === 'invalid') {
    values.push(item.entry.name, item.entry.id, commandRefKey(item.entry), ...(item.aliases || []));
  } else if (item.kind === 'alias') {
    values.push(
      item.alias,
      ...(Array.isArray(item.targets)
        ? item.targets.flatMap((target) => [target.name, target.id, commandRefKey(target)])
        : [])
    );
  }
  return values;
}

export function reviewItemMatchesFilter(item, filterText) {
  return itemMatchesTextFilter(item, filterText, getBundleReviewFilterValues);
}

export function compareAliasReviewItems(left, right, sortKey = 'alias') {
  if (sortKey === 'targets') {
    return String(left.detail || '').localeCompare(String(right.detail || ''))
      || left.alias.localeCompare(right.alias);
  }
  return left.alias.localeCompare(right.alias)
    || String(left.detail || '').localeCompare(String(right.detail || ''));
}

export function getSortedBundleReviewItems(items, kind, sortState = DEFAULT_BUNDLE_REVIEW_SORT_STATE) {
  if (kind === 'commands') {
    return filterAndSortListItems(items, {
      compareItems: (left, right) => compareCommandValues(left.command, right.command, sortState.commandsSortKey),
      direction: sortState.commandsSortDirection
    });
  }
  if (kind === 'aliases') {
    return filterAndSortListItems(items, {
      compareItems: (left, right) => compareAliasReviewItems(left, right, sortState.aliasesSortKey),
      direction: sortState.aliasesSortDirection
    });
  }
  return items;
}

export function getBundleReviewFilterValue(kind, viewState = {}) {
  if (viewState.mode !== 'export') {
    return viewState.filter || '';
  }
  if (kind === 'commands') {
    return viewState.commandsFilter || '';
  }
  if (kind === 'aliases') {
    return viewState.aliasesFilter || '';
  }
  return viewState.filter || '';
}

export function getVisibleBundleReviewItems(items, kind, viewState = {}) {
  return getSortedBundleReviewItems(
    filterAndSortListItems(items, {
      filterText: getBundleReviewFilterValue(kind, viewState),
      getFilterValues: getBundleReviewFilterValues
    }),
    kind,
    viewState
  );
}

export function selectVisibleBundleReviewItems(review, kind, selected, viewState = {}) {
  const items = kind === 'commands' ? review.commands : review.aliases;
  for (const item of getVisibleBundleReviewItems(items, kind, viewState)) {
    item.selected = selected;
  }
}

export function getSelectedBundleReviewCount(review) {
  return review
    ? [...review.commands, ...review.invalidCommands, ...review.aliases]
      .filter((item) => item.selected !== false)
      .length
    : 0;
}

export function buildReviewedBundle(review, now = Date.now()) {
  const aliases = {};
  for (const item of review.aliases) {
    if (item.selected !== false) {
      aliases[item.alias] = item.targets;
    }
  }

  return {
    bundleSchemaVersion: 1,
    exportedAt: review.bundle.exportedAt || now,
    commands: review.commands.filter((item) => item.selected !== false).map((item) => item.command),
    ...(review.invalidCommands.some((item) => item.selected !== false)
      ? {
          invalidCommands: review.invalidCommands
            .filter((item) => item.selected !== false)
            .map((item) => item.entry)
        }
      : {}),
    aliases
  };
}

export function reviewStateLabel(state, labels) {
  if (state === 'overwrite-invalid') {
    return labels.overwriteInvalid;
  }
  if (state === 'overwrite-valid') {
    return labels.overwriteValid;
  }
  if (state === 'overwrite') {
    return labels.overwrite;
  }
  if (state === 'same') {
    return labels.same;
  }
  return labels.new;
}

export function createBundleReviewRenderer({
  document,
  nodes,
  labels,
  getViewState
}) {
  let pendingReview = null;

  function createItem(item, mode = 'import') {
    const row = document.createElement('label');
    row.className = 'bundle-review-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected !== false;
    checkbox.addEventListener('change', () => {
      item.selected = checkbox.checked;
      updateActions();
    });

    const copy = document.createElement('div');
    copy.className = 'bundle-review-item-copy';

    const title = document.createElement('div');
    title.className = 'bundle-review-item-title';
    title.textContent = item.title;

    const detail = document.createElement('div');
    detail.className = 'bundle-review-item-detail';
    detail.textContent = item.detail || '';

    copy.append(title);
    if (item.detail) {
      copy.append(detail);
    }

    row.append(checkbox, copy);
    if (mode === 'import') {
      const pill = document.createElement('span');
      pill.className = `bundle-review-pill bundle-review-pill-${item.state}`;
      pill.textContent = reviewStateLabel(item.state, labels.states);
      row.append(pill);
    }
    return row;
  }

  function renderSection(section, container, items, mode = 'import', kind = '') {
    container.textContent = '';
    const filteredItems = getVisibleBundleReviewItems(items, kind, getViewState());
    if (!filteredItems.length) {
      section.hidden = true;
      return 0;
    }
    section.hidden = false;
    for (const item of filteredItems) {
      container.append(createItem(item, mode));
    }
    return filteredItems.length;
  }

  function hide() {
    pendingReview = null;
    nodes.review.hidden = true;
    nodes.filter.value = '';
    nodes.commandsFilter.value = '';
    nodes.aliasesFilter.value = '';
    nodes.commands.textContent = '';
    nodes.invalid.textContent = '';
    nodes.aliases.textContent = '';
    nodes.empty.hidden = true;
    nodes.empty.textContent = '';
  }

  function updateActions() {
    nodes.actionButton.disabled = getSelectedBundleReviewCount(pendingReview) === 0;
  }

  function show(review) {
    pendingReview = review;
    const mode = review.mode || 'import';
    const isExport = mode === 'export';
    nodes.title.textContent = isExport ? labels.exportTitle : labels.importTitle;
    nodes.hint.textContent = isExport ? labels.exportHint : labels.importHint;
    nodes.actionButton.textContent = isExport ? labels.exportAction : labels.importAction;
    nodes.filter.hidden = isExport;
    nodes.commandsActions.hidden = !isExport || review.commands.length === 0;
    nodes.aliasesActions.hidden = !isExport || review.aliases.length === 0;
    const visibleCount = (
      renderSection(nodes.commandsSection, nodes.commands, review.commands, mode, 'commands')
      + renderSection(nodes.invalidSection, nodes.invalid, review.invalidCommands, mode, 'invalid')
      + renderSection(nodes.aliasesSection, nodes.aliases, review.aliases, mode, 'aliases')
    );
    nodes.empty.hidden = visibleCount > 0;
    nodes.empty.textContent = visibleCount > 0 ? '' : labels.empty;
    nodes.review.hidden = !review.commands.length && !review.invalidCommands.length && !review.aliases.length;
    updateActions();
  }

  function refresh() {
    if (pendingReview) {
      show(pendingReview);
    }
  }

  function setSelection(kind, selected) {
    if (!pendingReview) {
      return;
    }
    selectVisibleBundleReviewItems(pendingReview, kind, selected, getViewState());
    show(pendingReview);
  }

  return {
    get pendingReview() {
      return pendingReview;
    },
    hide,
    refresh,
    setSelection,
    show,
    updateActions
  };
}
