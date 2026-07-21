export function serializeError(error, fallbackCode = 'ERROR', fallbackMessage = fallbackCode) {
  if (!error) {
    return {
      message: fallbackMessage,
      code: fallbackCode
    };
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack,
    code: error.code || fallbackCode,
    ...(error.details !== undefined ? { details: error.details } : {})
  };
}

export function deserializeError(payload, fallbackCode = 'ERROR', fallbackMessage = 'Invocation failed') {
  const detail = payload && typeof payload === 'object' ? payload : {};
  const error = new Error(detail.message || fallbackMessage);
  error.name = detail.name || 'Error';
  error.stack = detail.stack;
  error.code = detail.code || fallbackCode;
  if (detail.details !== undefined) {
    error.details = detail.details;
  }
  return error;
}

export function createCodedError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}
