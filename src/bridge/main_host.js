const CHANNEL = '__factotum_main_bridge__';

function serializeError(error, code = 'BRIDGE_FAILED') {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code || code
  };
}

if (!window.__factotumMainHostInstalled) {
  const handlersByInvocation = new Map();

  function getInvocationHandlers(invocationId) {
    let handlers = handlersByInvocation.get(invocationId);
    if (!handlers) {
      handlers = new Map();
      handlersByInvocation.set(invocationId, handlers);
    }
    return handlers;
  }

  function postResponse(sourceWindow, payload) {
  sourceWindow.postMessage({
    channel: CHANNEL,
    ...payload
  }, '*');
}

  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || data.channel !== CHANNEL || !data.invocationId || !data.nonce || !data.op) {
      return;
    }
    const sourceWindow = event.source;
    if (!sourceWindow || typeof sourceWindow.postMessage !== 'function') {
      return;
    }

    const base = {
      invocationId: data.invocationId,
      nonce: data.nonce,
      callId: data.callId
    };

    try {
      if (data.op === 'DEFINE') {
        const handlers = getInvocationHandlers(data.invocationId);
        // Best-effort only; reconstructing functions in MAIN may fail on restrictive pages.
        const fn = globalThis.eval(`(${data.source})`);
        handlers.set(data.name, fn);
        postResponse(sourceWindow, { ...base, ok: true, result: true });
        return;
      }

      if (data.op === 'CALL') {
        const handlers = getInvocationHandlers(data.invocationId);
        const fn = handlers.get(data.name);
        if (typeof fn !== 'function') {
          throw Object.assign(new Error(`No such main entrypoint: ${data.name}`), { code: 'BRIDGE_FAILED' });
        }
        const result = await fn(...(Array.isArray(data.args) ? data.args : []));
        postResponse(sourceWindow, { ...base, ok: true, result });
        return;
      }

      if (data.op === 'UNDEF') {
        const handlers = getInvocationHandlers(data.invocationId);
        handlers.delete(data.name);
        postResponse(sourceWindow, { ...base, ok: true, result: true });
        return;
      }
    } catch (error) {
      postResponse(sourceWindow, {
        ...base,
        ok: false,
        error: serializeError(error)
      });
    }
  });

  window.__factotumMainHostInstalled = true;
  console.log('[factotum] MAIN host loaded');
}
