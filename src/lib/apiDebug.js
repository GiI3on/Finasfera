// src/lib/apiDebug.js
let _logs = [];

export function logApi(kind, payload, { ok, status, info }) {
  _logs.push({
    ts: new Date().toISOString(),
    kind,
    status,
    ok: !!ok,
    info: typeof info === "string" ? info : JSON.stringify(info ?? null),
    payload,
  });
  if (_logs.length > 100) _logs = _logs.slice(-100);
}

export function getApiDebug() {
  return _logs.slice().reverse();
}

export function clearApiDebug() {
  _logs = [];
}
