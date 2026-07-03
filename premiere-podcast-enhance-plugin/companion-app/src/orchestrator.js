const os = require("os");
const path = require("path");
const fs = require("fs");
const { Notification } = require("electron");

const jobStore = require("./server/jobStore");
const logger = require("./lib/logger");
const settings = require("./lib/settingsStore");
const adobePodcast = require("./automation/adobePodcast");

const TMP_DIR = path.join(os.tmpdir(), "podcast-enhance-plugin");
fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * One job at a time through the browser-automation stage (a single
 * Chromium profile driving one upload at a time is far more reliable than
 * racing several) — additional triggers while a job is automating are
 * queued and started in order. The Premiere-side export/import stages
 * could in principle run concurrently, but keeping the whole pipeline
 * serial keeps failure modes easy to reason about for v1.
 */
class Orchestrator {
  constructor(bridge, windowManager) {
    this.bridge = bridge;
    this.windowManager = windowManager;
    this.queue = [];
    this.running = false;
  }

  /** Entry point for both the global hotkey and the panel's manual-trigger button. */
  enqueueNewJob() {
    this.queue.push({ kind: "new" });
    logger.info(null, "queue", `New job queued (position ${this.queue.length}).`);
    this._pump();
  }

  /** Re-runs a failed job, resuming from whatever stage it got stuck at
   * (runJob() skips stages whose output is already recorded in jobStore). */
  retryJob(jobId) {
    const job = jobStore.get(jobId);
    this.queue.push({ kind: "resume", jobId, clipName: job?.clipName || "Clip" });
    logger.info(jobId, "queue", "Retry queued.");
    this._pump();
  }

  async _pump() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const entry = this.queue.shift();
    try {
      if (entry.kind === "new") await this._runNewJob();
      else await this.runJob(entry.jobId, entry.clipName);
    } catch (err) {
      // Already logged/notified inside the stage wrapper.
    } finally {
      this.running = false;
      this._pump();
    }
  }

  async _runNewJob() {
    if (!this.bridge.isPanelConnected()) {
      this._notify(
        "Premiere panel not connected",
        "Open the Podcast Enhance panel in Premiere, then trigger the shortcut again."
      );
      return;
    }

    // Stage 1: ask Premiere what's selected, get a jobId back from the panel.
    const selectionMsg = await this._stage(null, "selection", () =>
      this.bridge.request("get-selection", {}, 30000)
    );
    if (!selectionMsg.ok) {
      this._notify("No clip selected", selectionMsg.error);
      return;
    }

    const jobId = selectionMsg.jobId;
    const clipName = selectionMsg.clip.name;
    this.windowManager.trackJob(jobId);
    jobStore.upsert(jobId, { status: "exporting", clipName });

    await this.runJob(jobId, clipName);
  }

  /** Runs (or resumes) a job's pipeline from whatever stage it's at. */
  async runJob(jobId, clipName) {
    this.windowManager.trackJob(jobId);
    const job = jobStore.get(jobId) || { clipName };
    const exportedPath = job.exportedPath || path.join(TMP_DIR, `${jobId}.wav`);
    const enhancedOutDir = TMP_DIR;

    try {
      if (!job.exportedPath) {
        await this._stage(jobId, "export", async () => {
          const res = await this.bridge.request(
            "export-audio",
            { jobId, outPath: exportedPath },
            settings.get("exportTimeoutMs")
          );
          if (!res.ok) throw new Error(res.error);
          jobStore.upsert(jobId, { exportedPath, status: "awaiting-params" });
        });
      }

      let params = job.params;
      let replaceInPlace = job.replaceInPlace;
      if (!params) {
        const result = await this._stage(jobId, "params", () =>
          this.windowManager.collectParams(jobId, clipName, exportedPath)
        );
        if (result.cancelled) {
          jobStore.upsert(jobId, { status: "cancelled" });
          return;
        }
        ({ params, replaceInPlace } = result);
        settings.setLastUsedParams(params);
        jobStore.upsert(jobId, { params, replaceInPlace, status: "automating" });
      }

      const enhancedPath =
        job.enhancedPath ||
        (await this._stage(jobId, "automation", () =>
          adobePodcast.enhance({
            inputPath: exportedPath,
            outputDir: enhancedOutDir,
            params,
            onProgress: (stage, message) => {
              logger.info(jobId, `automation:${stage}`, message);
              this.windowManager.pushProgress(jobId, message);
            },
          })
        ));
      jobStore.upsert(jobId, { enhancedPath, status: "importing" });

      await this._confirmReplaceInPlaceOnce(replaceInPlace);

      await this._stage(jobId, "import", async () => {
        const res = await this.bridge.request(
          "import-and-replace",
          { jobId, path: enhancedPath, replaceInPlace },
          60000
        );
        if (!res.ok) throw new Error(res.error);
      });

      jobStore.upsert(jobId, { status: "done" });
      this.windowManager.pushDone(jobId);
      this._notify("Podcast Enhance", `"${clipName}" imported to project.`);
    } catch (err) {
      // Already logged + surfaced to the window by _stage(); nothing further to do.
    }
  }

  async _confirmReplaceInPlaceOnce(replaceInPlace) {
    if (!replaceInPlace || settings.hasConfirmedReplaceInPlace()) return;
    const { dialog } = require("electron");
    const result = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Replace in Place", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      title: "Replace clip in place?",
      message: "This will repoint the original clip's source media to the enhanced file.",
      detail:
        "Every place this clip appears on the timeline will start using the enhanced audio instead " +
        "of the original — position, trim points, and sync are preserved because only the underlying " +
        "media reference changes. The original file on disk is not deleted or modified; you can undo " +
        "this in Premiere's Edit History if needed.\n\nThis confirmation only appears once.",
    });
    if (result.response !== 0) {
      throw new Error("Replace-in-place cancelled by user at first-time confirmation.");
    }
    settings.setConfirmedReplaceInPlace();
  }

  async _stage(jobId, stageName, fn) {
    jobStore.upsert(jobId, { stage: stageName });
    logger.info(jobId, stageName, "starting");
    try {
      const result = await fn();
      logger.info(jobId, stageName, "ok");
      return result;
    } catch (err) {
      logger.error(jobId, stageName, err.message);
      jobStore.upsert(jobId, { status: "failed", stage: stageName, error: err.message });
      this.windowManager.pushFailed(jobId, stageName, err.message);
      this._notify(`Podcast Enhance failed at "${stageName}"`, err.message);
      throw err;
    }
  }

  _notify(title, body) {
    try {
      new Notification({ title, body }).show();
    } catch {
      // Notifications unavailable in some environments; the tray/log already has it.
    }
  }
}

module.exports = { Orchestrator };
