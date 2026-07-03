const Store = require("electron-store");

const store = new Store({
  name: "podcast-enhance-settings",
  defaults: {
    hotkey: "CommandOrControl+Shift+P",
    wsPort: 8934,
    lastUsedParams: { strength: 50, speech: 100, noise: 0, music: 0 },
    presets: {},
    replaceInPlaceDefault: true,
    hasConfirmedReplaceInPlace: false,
    exportTimeoutMs: 5 * 60 * 1000,
    automationTimeoutMs: 8 * 60 * 1000,
  },
});

module.exports = {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),

  getLastUsedParams: () => store.get("lastUsedParams"),
  setLastUsedParams: (params) => store.set("lastUsedParams", params),

  getPresets: () => store.get("presets"),
  savePreset: (name, params) => {
    const presets = store.get("presets");
    presets[name] = params;
    store.set("presets", presets);
  },
  deletePreset: (name) => {
    const presets = store.get("presets");
    delete presets[name];
    store.set("presets", presets);
  },

  hasConfirmedReplaceInPlace: () => store.get("hasConfirmedReplaceInPlace"),
  setConfirmedReplaceInPlace: () => store.set("hasConfirmedReplaceInPlace", true),

  raw: store,
};
