const { app, Tray, Menu, globalShortcut, ipcMain, shell } = require("electron");
const path = require("path");

const settings = require("./lib/settingsStore");
const logger = require("./lib/logger");
const jobStore = require("./server/jobStore");
const { startBridge } = require("./server/wsServer");
const { WindowManager } = require("./windowManager");
const { Orchestrator } = require("./orchestrator");

// Podcast Enhance is a small always-running background utility, not a
// dock/taskbar app — no visible window on launch, lives in the tray.
app.dock?.hide();

let tray = null;
let bridge = null;
let orchestrator = null;
let windowManager = null;

function registerHotkey() {
  const hotkey = settings.get("hotkey");
  const ok = globalShortcut.register(hotkey, () => {
    logger.info(null, "hotkey", `Triggered (${hotkey}).`);
    orchestrator.enqueueNewJob();
  });
  if (!ok) {
    logger.error(null, "hotkey", `Failed to register global shortcut "${hotkey}" — it's likely bound by another app.`);
  }
  return ok;
}

function updateTrayStatus(connected) {
  if (!tray) return;
  tray.setToolTip(
    `Podcast Enhance — ${connected ? "Premiere panel connected" : "waiting for Premiere panel"}`
  );
  rebuildTrayMenu(connected);
}

function rebuildTrayMenu(connected) {
  const hotkey = settings.get("hotkey");
  const menu = Menu.buildFromTemplate([
    { label: `Status: ${connected ? "Connected to Premiere" : "Waiting for Premiere panel"}`, enabled: false },
    { label: `Shortcut: ${hotkey}`, enabled: false },
    { type: "separator" },
    { label: "Enhance Selected Clip Now", click: () => orchestrator.enqueueNewJob() },
    { label: "Run Adobe Login Setup…", click: () => runSetupLogin() },
    { type: "separator" },
    { label: "View Browser Profile Folder", click: () => shell.showItemInFolder(require("./automation/browserProfile").PROFILE_DIR) },
    { type: "separator" },
    { label: "Quit Podcast Enhance", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function runSetupLogin() {
  const { spawn } = require("child_process");
  spawn(process.execPath, [path.join(__dirname, "..", "scripts", "setup-login.js")], {
    stdio: "inherit",
    detached: true,
  });
}

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, "..", "assets", "tray-icon.png"));

  windowManager = new WindowManager();
  windowManager.registerIpc();

  bridge = startBridge(settings.get("wsPort"));
  bridge.on("panel-connected", () => updateTrayStatus(true));
  bridge.on("panel-disconnected", () => updateTrayStatus(false));
  bridge.on("message", (msg) => {
    if (msg.type === "manual-trigger") orchestrator.enqueueNewJob();
  });

  orchestrator = new Orchestrator(bridge, windowManager);

  ipcMain.on("job:retry", (_evt, { jobId }) => orchestrator.retryJob(jobId));

  const hotkeyOk = registerHotkey();
  updateTrayStatus(false);
  logger.info(
    null,
    "startup",
    `Companion app ready. WS bridge on 127.0.0.1:${settings.get("wsPort")}. Hotkey ${
      hotkeyOk ? "registered" : "FAILED to register"
    }: ${settings.get("hotkey")}.`
  );
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Background utility — don't quit just because no window is open.
app.on("window-all-closed", (e) => e.preventDefault());

process.on("unhandledRejection", (err) => {
  logger.error(null, "process", `Unhandled rejection: ${err?.message || err}`);
});
