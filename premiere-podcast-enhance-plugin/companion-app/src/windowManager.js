const path = require("path");
const { BrowserWindow, ipcMain, screen } = require("electron");
const settings = require("./lib/settingsStore");

/**
 * Owns the single "parameters / progress" window. It's a small, always-
 * on-top window independent of Premiere's own UI (so it shows up whether
 * or not Premiere has focus, per the spec's "small dedicated window"
 * requirement) that walks through: params form -> progress -> done/failed.
 */
class WindowManager {
  constructor() {
    this.win = null;
    this.activeJobId = null;
    this.pendingResolve = null;
  }

  _ensureWindow() {
    if (this.win && !this.win.isDestroyed()) return this.win;

    const display = screen.getPrimaryDisplay();
    this.win = new BrowserWindow({
      width: 380,
      height: 520,
      x: display.workArea.x + display.workArea.width - 400,
      y: display.workArea.y + 40,
      resizable: false,
      alwaysOnTop: true,
      show: false,
      title: "Podcast Enhance",
      webPreferences: {
        preload: path.join(__dirname, "windows", "params", "preload.js"),
        contextIsolation: true,
      },
    });
    this.win.loadFile(path.join(__dirname, "windows", "params", "index.html"));
    this.win.on("close", (e) => {
      if (this.pendingResolve) {
        e.preventDefault();
        this.win.hide();
      }
    });
    return this.win;
  }

  /** Call as soon as a jobId exists, before any stage runs, so progress/failure
   * pushes for early stages (e.g. export, before the params form is shown)
   * have somewhere to go. */
  trackJob(jobId) {
    this.activeJobId = jobId;
  }

  /** Shows the params form and resolves once the user confirms or cancels. */
  collectParams(jobId, clipName, exportedAudioPath) {
    const win = this._ensureWindow();
    this.activeJobId = jobId;

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      const send = () =>
        win.webContents.send("job:init", {
          jobId,
          clipName,
          exportedAudioPath,
          defaults: settings.getLastUsedParams(),
          replaceInPlaceDefault: settings.get("replaceInPlaceDefault"),
          presets: settings.getPresets(),
        });

      if (win.webContents.isLoading()) {
        win.webContents.once("did-finish-load", send);
      } else {
        send();
      }
      win.show();
      win.focus();
    });
  }

  pushProgress(jobId, message) {
    if (jobId !== this.activeJobId || !this.win || this.win.isDestroyed()) return;
    this.win.webContents.send("job:progress", { jobId, message });
  }

  pushDone(jobId) {
    if (jobId !== this.activeJobId || !this.win || this.win.isDestroyed()) return;
    this.win.webContents.send("job:done", { jobId });
    this.activeJobId = null;
  }

  pushFailed(jobId, stage, error) {
    if (jobId !== this.activeJobId) return;
    const win = this._ensureWindow();
    const send = () => win.webContents.send("job:failed", { jobId, stage, error });
    if (win.webContents.isLoading()) win.webContents.once("did-finish-load", send);
    else send();
    win.show();
    win.focus();
  }

  registerIpc() {
    ipcMain.on("job:confirm", (_evt, payload) => {
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve({ params: payload.params, replaceInPlace: payload.replaceInPlace, cancelled: false });
      }
      if (payload.presetName) {
        settings.savePreset(payload.presetName, payload.params);
      }
    });

    ipcMain.on("job:cancel", () => {
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve({ cancelled: true });
      }
      this.win?.hide();
    });

    ipcMain.on("job:dismiss", () => {
      this.win?.hide();
    });
  }
}

module.exports = { WindowManager };
