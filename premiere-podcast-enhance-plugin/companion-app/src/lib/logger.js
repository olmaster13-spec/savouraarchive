/**
 * Minimal structured logger. Every step of a job is logged with its jobId
 * and stage so a failure can always be traced to exactly which step broke
 * (per the "fail loudly, not silently" requirement) — printed to the
 * terminal running `npm start` and also kept in-memory for the tray/status
 * window to display.
 */

const MAX_HISTORY = 200;
const history = [];
const listeners = new Set();

function log(level, jobId, stage, message) {
  const entry = { ts: new Date().toISOString(), level, jobId: jobId || null, stage: stage || null, message };
  history.push(entry);
  if (history.length > MAX_HISTORY) history.shift();

  const prefix = `[${entry.ts}]${jobId ? ` [${jobId}]` : ""}${stage ? ` [${stage}]` : ""}`;
  if (level === "error") console.error(prefix, message);
  else console.log(prefix, message);

  for (const fn of listeners) fn(entry);
  return entry;
}

module.exports = {
  info: (jobId, stage, message) => log("info", jobId, stage, message),
  error: (jobId, stage, message) => log("error", jobId, stage, message),
  getHistory: () => history.slice(),
  onLog: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
