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
  let trustedScriptPolicy = undefined;

  function getTrustedScriptPolicy() {
    if (trustedScriptPolicy !== undefined) {
      return trustedScriptPolicy;
    }
    if (!globalThis.trustedTypes || typeof globalThis.trustedTypes.createPolicy !== 'function') {
      trustedScriptPolicy = null;
      return trustedScriptPolicy;
    }
    try {
      trustedScriptPolicy = globalThis.trustedTypes.createPolicy('__factotum_main_bridge__', {
        createScript(source) {
          return source;
        }
      });
    } catch {
      trustedScriptPolicy = null;
    }
    return trustedScriptPolicy;
  }

  function compileMainFunction(source) {
    const wrappedSource = `(${source})`;
    const policy = getTrustedScriptPolicy();
    if (policy) {
      return globalThis.eval(policy.createScript(wrappedSource));
    }
    if (globalThis.trustedTypes) {
      throw Object.assign(
        new Error('MAIN bridge define is blocked by Trusted Types on this page.'),
        { code: 'BRIDGE_FAILED' }
      );
    }
    return globalThis.eval(wrappedSource);
  }

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

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = () => resolve(true);
      script.onerror = () => reject(Object.assign(new Error(`Failed to load required script: ${url}`), { code: 'REQUIRES_FAILED' }));
      (document.head || document.documentElement).append(script);
    });
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
        const fn = compileMainFunction(data.source);
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

      if (data.op === 'REQUIRE_SCRIPT') {
        await loadScript(data.url);
        postResponse(sourceWindow, { ...base, ok: true, result: true });
        return;
      }

      if (data.op === 'IMPORT') {
        await import(data.url);
        postResponse(sourceWindow, { ...base, ok: true, result: true });
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
