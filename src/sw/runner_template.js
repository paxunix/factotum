import { serializeError } from '../shared/errors.js';

function createHelpRequestedError() {
  const error = new Error('Help requested');
  error.code = 'HELP_REQUESTED';
  return error;
}

export function buildUserScriptRunnerCode({
  invocation,
  controlType,
  requires,
  markerIds,
  rpcUnsupported
}) {
  const meta = JSON.stringify({
    invocationId: invocation.invocationId,
    argv: invocation.argv,
    debug: Boolean(invocation.argv?.options?.debug),
    world: invocation.command.world,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    nonce: invocation.nonce,
    requires,
    completionMarkerId: markerIds.completion,
    cancelMarkerId: markerIds.cancel,
    outputMarkerId: markerIds.output
  });
  const rpcUnsupportedJson = JSON.stringify(rpcUnsupported);
  const serializeErrorSource = serializeError.toString();
  const sourceUrl = `${invocation.command.name}@${invocation.command.id}`;

  const prefix = `
    (() => {
    /*
     * BEGIN USER COMMAND SOURCE
     *
     * The fcommand body from extension storage is inserted directly below inside
     * a factory function so DevTools shows the user source at the top of this
     * generated script while preserving the normal require-then-execute order.
     */
    const __factotumBuildUserMain = () => {
      if (${Boolean(invocation.argv?.options?.debug)}) {
        /*
         * Factotum built-in --debug stop.
         * Step over once to continue through the fcommand source and then into
         * the returned main(argv, ctx) call in the runtime wrapper below.
         */
        debugger;
      }
  `;

  const infix = `
    /*
     * END USER COMMAND SOURCE
     */

    (async () => {
      const __factotumMeta = ${meta};
      const __factotumSerializeError = ${serializeErrorSource};
      let __factotumCallSeq = 0;
      const __factotumPendingMainCalls = new Map();

      const __factotumMainListener = (event) => {
        const data = event.data;
        if (!data || data.channel !== '__factotum_main_bridge__') {
          return;
        }
        if (data.invocationId !== __factotumMeta.invocationId || data.nonce !== __factotumMeta.nonce) {
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'ok')) {
          return;
        }
        const pending = __factotumPendingMainCalls.get(data.callId);
        if (!pending) {
          return;
        }
        __factotumPendingMainCalls.delete(data.callId);
        if (data.ok) {
          pending.resolve(data.result);
        } else {
          const error = new Error(data.error?.message || 'MAIN bridge call failed');
          error.name = data.error?.name || 'Error';
          error.code = data.error?.code || 'BRIDGE_FAILED';
          error.stack = data.error?.stack;
          pending.reject(error);
        }
      };
      window.addEventListener('message', __factotumMainListener);

      function __factotumSendMain(op, payload) {
        const callId = 'main-' + (++__factotumCallSeq);
        return new Promise((resolve, reject) => {
          __factotumPendingMainCalls.set(callId, { resolve, reject });
          window.postMessage({
            channel: '__factotum_main_bridge__',
            invocationId: __factotumMeta.invocationId,
            nonce: __factotumMeta.nonce,
            callId,
            op,
            ...payload
          }, '*');
        });
      }

      function __factotumWriteCompletion(payload) {
        let marker = document.getElementById(__factotumMeta.completionMarkerId);
        if (!marker) {
          marker = document.createElement('script');
          marker.id = __factotumMeta.completionMarkerId;
          marker.type = 'application/json';
          marker.hidden = true;
          (document.documentElement || document.body || document.head).append(marker);
        }

        let serialized = '';
        try {
          serialized = JSON.stringify(payload);
        } catch (error) {
          serialized = JSON.stringify({
            status: 'failed',
            error: __factotumSerializeError(error, 'UNCLONEABLE_RESULT')
          });
        }

        marker.textContent = serialized;
      }

      function __factotumCancelRequested() {
        const marker = document.getElementById(__factotumMeta.cancelMarkerId);
        return Boolean(marker && marker.textContent === '1');
      }

      function __factotumAppendOutput(entry) {
        let marker = document.getElementById(__factotumMeta.outputMarkerId);
        if (!marker) {
          marker = document.createElement('script');
          marker.id = __factotumMeta.outputMarkerId;
          marker.type = 'application/json';
          marker.hidden = true;
          (document.documentElement || document.body || document.head).append(marker);
        }

        let entries = [];
        try {
          entries = JSON.parse(marker.textContent || '[]');
          if (!Array.isArray(entries)) {
            entries = [];
          }
        } catch {
          entries = [];
        }
        entries.push(entry);
        marker.textContent = JSON.stringify(entries);
      }

      function __factotumSendRpc(method, args) {
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage({
              type: '${controlType}',
              op: 'RPC_REQUEST',
              invocationId: __factotumMeta.invocationId,
              method,
              args: Array.isArray(args) ? args : []
            }, (response) => {
              const runtimeError = chrome.runtime.lastError;
              if (runtimeError) {
                const error = new Error(runtimeError.message || 'RPC failed');
                error.code = 'RPC_FAILED';
                reject(error);
                return;
              }

              if (!response || response.ok !== true) {
                const detail = response?.error || {};
                const error = new Error(detail.message || 'RPC failed');
                error.name = detail.name || 'Error';
                error.code = detail.code || 'RPC_FAILED';
                error.stack = detail.stack;
                error.details = detail.details;
                reject(error);
                return;
              }

              resolve(response.result);
            });
          } catch (error) {
            reject(error);
          }
        });
      }

      function __factotumCreateRpcProxy(path = []) {
        const unsupported = ${rpcUnsupportedJson};

        function __factotumGetUnsupported(parts) {
          if (!parts.length) {
            return null;
          }
          if (unsupported.denylistedNamespaces.includes(parts[0])) {
            return {
              code: 'UNSUPPORTED_MEMBER',
              message: 'Unsupported member: ' + parts.join('.')
            };
          }
          if (parts.some((part) => unsupported.eventMethods.includes(part))) {
            return {
              code: 'UNSUPPORTED_API_SHAPE',
              message: 'Events are not supported in v1: ' + parts.join('.')
            };
          }
          if (parts.some((part) => unsupported.denylistedMethods.includes(part))) {
            return {
              code: 'UNSUPPORTED_MEMBER',
              message: 'Unsupported member: ' + parts.join('.')
            };
          }
          return null;
        }

        return new Proxy(function __factotumRpcMethod() {}, {
          get(_target, prop) {
            if (typeof prop === 'symbol') {
              return undefined;
            }
            const nextPath = path.concat(String(prop));
            const nextUnsupported = __factotumGetUnsupported(nextPath);
            if (nextUnsupported && unsupported.eventMethods.includes(String(prop))) {
              throw Object.assign(new Error(nextUnsupported.message), { code: nextUnsupported.code });
            }
            return __factotumCreateRpcProxy(nextPath);
          },
          apply(_target, _thisArg, args) {
            const unsupportedDetail = __factotumGetUnsupported(path);
            if (unsupportedDetail) {
              throw Object.assign(new Error(unsupportedDetail.message), { code: unsupportedDetail.code });
            }
            return __factotumSendRpc(path.join('.'), Array.isArray(args) ? args : []);
          }
        });
      }

      async function __factotumLoadRequire(entry) {
        if (!entry || typeof entry.url !== 'string') {
          throw Object.assign(new Error('Invalid require entry'), { code: 'REQUIRES_FAILED' });
        }
        if (/^data:/i.test(entry.url)) {
          throw Object.assign(new Error('Requires cannot use data: URLs: ' + entry.url), { code: 'REQUIRES_FAILED' });
        }
        if (entry.world === 'user_script') {
          if (entry.kind !== 'module') {
            throw Object.assign(new Error('USER_SCRIPT requires must be modules: ' + entry.url), { code: 'REQUIRES_FAILED' });
          }
          try {
            await import(entry.url);
            return;
          } catch (error) {
            const wrapped = new Error('USER_SCRIPT module require failed for ' + entry.url + ': ' + (error?.message || String(error)));
            wrapped.name = error?.name || 'Error';
            wrapped.stack = error?.stack;
            wrapped.code = 'REQUIRES_FAILED';
            throw wrapped;
          }
        }

        const op = entry.kind === 'module' ? 'IMPORT' : 'REQUIRE_SCRIPT';
        try {
          await __factotumSendMain(op, { url: entry.url });
        } catch (error) {
          const wrapped = new Error('MAIN ' + entry.kind + ' require failed for ' + entry.url + ': ' + (error?.message || String(error)));
          wrapped.name = error?.name || 'Error';
          wrapped.stack = error?.stack;
          wrapped.code = 'REQUIRES_FAILED';
          throw wrapped;
        }
      }

      async function __factotumLoadRequires() {
        for (const entry of __factotumMeta.requires || []) {
          await __factotumLoadRequire(entry);
        }
      }

      __factotumWriteCompletion({ status: 'pending' });

      const ctx = {
        signal: {
          get aborted() {
            return __factotumCancelRequested();
          }
        },
        argv: __factotumMeta.argv,
        chrome: new Proxy({}, {
          get(_target, prop) {
            if (typeof prop === 'symbol') {
              return undefined;
            }
            return __factotumCreateRpcProxy([String(prop)]);
          }
        }),
        main: {
          define(name, fn) {
            if (typeof name !== 'string' || typeof fn !== 'function') {
              throw new Error('ctx.main.define(name, fn) requires a string name and function');
            }
            return __factotumSendMain('DEFINE', {
              name,
              source: fn.toString()
            });
          },
          call(name, args = []) {
            if (typeof name !== 'string') {
              throw new Error('ctx.main.call(name, args) requires a string name');
            }
            return __factotumSendMain('CALL', {
              name,
              args: Array.isArray(args) ? args : []
            });
          }
        },
        out: {
          write(value, options) {
            __factotumAppendOutput({ level: 'info', value, options });
          },
          info(value, options) {
            __factotumAppendOutput({ level: 'info', value, options });
          },
          warn(value, options) {
            __factotumAppendOutput({ level: 'warn', value, options });
          },
          error(value, options) {
            __factotumAppendOutput({ level: 'error', value, options });
          }
        },
        help(value, options = {}) {
          const detail = options && typeof options === 'object' && !Array.isArray(options)
            ? options
            : {};
          const level = ['info', 'warn', 'error'].includes(detail.level)
            ? detail.level
            : 'error';
          const outputOptions = {};
          if (detail.pretty != null) {
            outputOptions.pretty = Boolean(detail.pretty);
          }
          if (value !== undefined) {
            __factotumAppendOutput({ level, value, options: outputOptions });
          }
          throw (${createHelpRequestedError.toString()})();
        },
        log(...args) {
          console.log('[factotum command]', ...args);
        },
        warn(...args) {
          console.warn('[factotum command]', ...args);
        },
        error(...args) {
          console.error('[factotum command]', ...args);
        }
      };

      try {
        console.info('[factotum execute]', __factotumMeta.commandRef, __factotumMeta.world);
        await __factotumLoadRequires();
        const __factotumMain = __factotumBuildUserMain();
        if (typeof __factotumMain !== 'function') {
          __factotumWriteCompletion({
            status: 'no_main'
          });
          return undefined;
        }
        const __factotumResult = await __factotumMain(__factotumMeta.argv, ctx);
        __factotumWriteCompletion({
          status: 'completed',
          result: __factotumResult
        });
        return __factotumResult;
      } catch (error) {
        if (error?.code === 'HELP_REQUESTED') {
          __factotumWriteCompletion({
            status: 'help'
          });
          return undefined;
        }
        __factotumWriteCompletion({
          status: 'failed',
          error: __factotumSerializeError(error, 'ERROR')
        });
        throw error;
      } finally {
        window.removeEventListener('message', __factotumMainListener);
      }
    })();
    })();
    //# sourceURL=${sourceUrl}
  `;

  const suffix = `
      return typeof main === 'function' ? main : undefined;
    };
  `;

  return [prefix, String(invocation.command.code || ''), suffix, infix].join('\n');
}
