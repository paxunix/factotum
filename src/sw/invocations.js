const invocationsById = new Map();
const invocationIdsByTab = new Map();

function createId(prefix) {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInvocation({ tabId, command, argvTokens, parsedOpts, sourceText }) {
  const invocation = {
    invocationId: createId('inv'),
    nonce: createId('nonce'),
    tabId,
    command,
    argvTokens,
    parsedOpts,
    sourceText,
    status: 'RUNNING',
    createdAt: Date.now(),
    canceled: false
  };

  invocationsById.set(invocation.invocationId, invocation);
  invocationIdsByTab.set(tabId, invocation.invocationId);
  return invocation;
}

export function isTabBusy(tabId) {
  return invocationIdsByTab.has(tabId);
}

export function getInvocationByTabId(tabId) {
  const invocationId = invocationIdsByTab.get(tabId);
  return invocationId ? invocationsById.get(invocationId) || null : null;
}

export function getInvocationById(invocationId) {
  return invocationsById.get(invocationId) || null;
}

export function updateInvocationStatus(invocationId, status, details = {}) {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    return null;
  }

  Object.assign(invocation, details, {
    status
  });
  return invocation;
}

export function cancelInvocation(invocationId, reason = 'CANCELED') {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    return null;
  }

  invocation.canceled = true;
  invocation.cancelReason = reason;
  invocation.status = 'CANCELED';
  invocation.canceledAt = Date.now();
  return invocation;
}

export function finishInvocation(invocationId, status, details = {}) {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    return null;
  }

  Object.assign(invocation, details, {
    status,
    endedAt: Date.now()
  });
  return invocation;
}

export function releaseTabBusy(invocationId) {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    return;
  }

  const activeInvocationId = invocationIdsByTab.get(invocation.tabId);
  if (activeInvocationId === invocationId) {
    invocationIdsByTab.delete(invocation.tabId);
  }
}

export function clearInvocation(invocationId) {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    return;
  }

  invocationIdsByTab.delete(invocation.tabId);
  invocationsById.delete(invocationId);
}
