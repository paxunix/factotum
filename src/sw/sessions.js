const sessionsByTab = new Map();

function createSession(tabId) {
  return {
    tabId,
    visible: false,
    activeInvocationId: null,
    snapshot: null,
    entries: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function ensureSession(tabId) {
  const key = Number(tabId);
  let session = sessionsByTab.get(key);
  if (!session) {
    session = createSession(key);
    sessionsByTab.set(key, session);
  }
  session.updatedAt = Date.now();
  return session;
}

export function getSession(tabId) {
  return sessionsByTab.get(Number(tabId)) || null;
}

export function setSessionVisibility(tabId, visible) {
  const session = ensureSession(tabId);
  session.visible = Boolean(visible);
  session.updatedAt = Date.now();
  return session;
}

export function setSessionActiveInvocation(tabId, invocationId) {
  const session = ensureSession(tabId);
  session.activeInvocationId = invocationId || null;
  session.updatedAt = Date.now();
  return session;
}

export function clearSessionActiveInvocation(tabId, invocationId = null) {
  const session = getSession(tabId);
  if (!session) {
    return null;
  }

  if (!invocationId || session.activeInvocationId === invocationId) {
    session.activeInvocationId = null;
    session.updatedAt = Date.now();
  }
  return session;
}

export function setSessionSnapshot(tabId, snapshot) {
  const session = ensureSession(tabId);
  session.snapshot = snapshot ? { ...snapshot } : null;
  session.updatedAt = Date.now();
  return session;
}

export function appendSessionEntry(tabId, entry) {
  const session = ensureSession(tabId);
  session.entries.push({
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: Date.now(),
    ...entry
  });
  session.updatedAt = Date.now();
  return session;
}

export function discardSession(tabId) {
  sessionsByTab.delete(Number(tabId));
}
