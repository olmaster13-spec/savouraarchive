const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("podcastEnhance", {
  onInit: (cb) => ipcRenderer.on("job:init", (_e, data) => cb(data)),
  onProgress: (cb) => ipcRenderer.on("job:progress", (_e, data) => cb(data)),
  onDone: (cb) => ipcRenderer.on("job:done", (_e, data) => cb(data)),
  onFailed: (cb) => ipcRenderer.on("job:failed", (_e, data) => cb(data)),

  confirm: (payload) => ipcRenderer.send("job:confirm", payload),
  cancel: () => ipcRenderer.send("job:cancel"),
  retry: (jobId) => ipcRenderer.send("job:retry", { jobId }),
  dismiss: () => ipcRenderer.send("job:dismiss"),
});
