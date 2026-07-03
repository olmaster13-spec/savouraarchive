const Store = require("electron-store");

const store = new Store({ name: "podcast-enhance-jobs", defaults: { jobs: {} } });

/**
 * jobId -> { status, clipName, stage, error, createdAt, updatedAt, params }
 * Persisted so a job that's mid-flight when the companion app or Premiere
 * restarts can still be inspected/resumed/reported rather than silently
 * vanishing.
 */

function upsert(jobId, patch) {
  const jobs = store.get("jobs");
  jobs[jobId] = { ...(jobs[jobId] || { createdAt: Date.now() }), ...patch, updatedAt: Date.now() };
  store.set("jobs", jobs);
  return jobs[jobId];
}

function get(jobId) {
  return store.get("jobs")[jobId] || null;
}

function all() {
  return store.get("jobs");
}

function remove(jobId) {
  const jobs = store.get("jobs");
  delete jobs[jobId];
  store.set("jobs", jobs);
}

module.exports = { upsert, get, all, remove };
