/* global document */

const { createWsClient } = require("./wsClient.js");
const { getSelectedAudioClip, exportClipAudio, importAndReplace } = require("./premiereActions.js");
const uxp = require("uxp");

const connDot = document.getElementById("connDot");
const connectionBlock = document.getElementById("connectionBlock");
const connectionMessage = document.getElementById("connectionMessage");
const readyBlock = document.getElementById("readyBlock");
const logList = document.getElementById("logList");
const manualTriggerBtn = document.getElementById("manualTriggerBtn");

// In-memory map of jobId -> clipInfo, so results coming back from the
// companion app (possibly after this panel or Premiere restarted mid-job)
// can be matched to the right timeline clip. Also mirrored to disk so a
// job that completes after a restart can still be resolved.
const activeJobs = new Map();

function log(message, isError) {
  const li = document.createElement("li");
  if (isError) li.className = "error";
  const ts = document.createElement("span");
  ts.className = "ts";
  ts.textContent = new Date().toLocaleTimeString();
  li.appendChild(ts);
  li.appendChild(document.createTextNode(message));
  logList.insertBefore(li, logList.firstChild);
}

function setConnected(isConnected) {
  connDot.className = "dot " + (isConnected ? "dot-on" : "dot-off");
  connectionBlock.classList.toggle("hidden", isConnected);
  readyBlock.classList.toggle("hidden", !isConnected);
}

const ws = createWsClient({
  onOpen() {
    setConnected(true);
    log("Connected to companion app.");
  },
  onClose() {
    setConnected(false);
    connectionMessage.textContent =
      "Disconnected from the companion app. Retrying every 2s… make sure it's running.";
  },
  onLog(message, isError) {
    log(message, isError);
  },
  async onMessage(msg) {
    try {
      switch (msg.type) {
        case "get-selection":
          await handleGetSelection(msg);
          break;
        case "export-audio":
          await handleExportAudio(msg);
          break;
        case "import-and-replace":
          await handleImportAndReplace(msg);
          break;
        default:
          log(`Unknown message type from companion app: ${msg.type}`, true);
      }
    } catch (err) {
      log(`Error handling "${msg.type}": ${err.message}`, true);
      ws.send({ type: "error", requestId: msg.requestId, jobId: msg.jobId, error: err.message });
    }
  },
});

async function handleGetSelection(msg) {
  try {
    const clip = await getSelectedAudioClip();
    const jobId = msg.jobId || cryptoRandomId();
    activeJobs.set(jobId, clip);
    log(`Selected clip "${clip.name}" — exporting audio for job ${jobId}.`);
    ws.send({
      type: "selection-result",
      requestId: msg.requestId,
      jobId,
      ok: true,
      clip: { name: clip.name, mediaPath: clip.mediaPath },
    });
  } catch (err) {
    log(err.message, true);
    ws.send({ type: "selection-result", requestId: msg.requestId, ok: false, error: err.message });
  }
}

async function handleExportAudio(msg) {
  const clip = activeJobs.get(msg.jobId);
  if (!clip) {
    ws.send({ type: "export-result", jobId: msg.jobId, ok: false, error: "Unknown job (panel restarted?)." });
    return;
  }
  try {
    log(`Rendering audio for "${clip.name}"…`);
    await exportClipAudio(clip, msg.outPath);
    log(`Export complete: ${msg.outPath}`);
    ws.send({ type: "export-result", jobId: msg.jobId, ok: true, path: msg.outPath });
  } catch (err) {
    log(`Export failed: ${err.message}`, true);
    ws.send({ type: "export-result", jobId: msg.jobId, ok: false, error: err.message });
  }
}

async function handleImportAndReplace(msg) {
  const clip = activeJobs.get(msg.jobId);
  if (!clip) {
    ws.send({ type: "import-result", jobId: msg.jobId, ok: false, error: "Unknown job (panel restarted?)." });
    return;
  }
  try {
    log(`Importing enhanced audio for "${clip.name}"…`);
    const result = await importAndReplace(clip, msg.path, msg.replaceInPlace);
    log(`Imported${msg.replaceInPlace ? " and replaced in place" : ""}: "${clip.name}".`);
    activeJobs.delete(msg.jobId);
    ws.send({ type: "import-result", jobId: msg.jobId, ok: true, ...result });
  } catch (err) {
    log(`Import failed: ${err.message}`, true);
    ws.send({ type: "import-result", jobId: msg.jobId, ok: false, error: err.message });
  }
}

function cryptoRandomId() {
  return "job-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Manual trigger lets you test/run the flow from inside the panel without
// the global hotkey, useful when a shortcut isn't wired up yet or you'd
// rather click than reach for the keyboard.
manualTriggerBtn.addEventListener("click", () => {
  ws.send({ type: "manual-trigger" });
});

setConnected(false);
