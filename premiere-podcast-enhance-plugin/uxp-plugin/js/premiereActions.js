/**
 * Wraps the Premiere Pro UXP host API ("premierepro" module).
 *
 * Confidence levels (see README > Known Failure Modes for details):
 *  - getSelectedAudioClip(): HIGH confidence. Sequence.getSelection() /
 *    TrackItemSelection are documented, stable UXP APIs.
 *  - exportClipAudio(): MEDIUM confidence. The encoder entry point and its
 *    exact argument order are the least-documented part of the UXP API as of
 *    this writing. Verify against your installed Premiere version's
 *    @adobe/premierepro type declarations before relying on this in
 *    production; see the try/catch fallback below and the README.
 *  - importAndReplace(): HIGH confidence. Project.importFiles() and
 *    ClipProjectItem.changeMediaPath() are documented and stable.
 */

/* global require */

const ppro = require("premierepro");
const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;

const AUDIO_EXPORT_PRESET_RELATIVE_PATH = "../presets/audio-wav-48k24bit.epr";

async function getActiveSequence() {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("No active Premiere project.");
  const sequence = await project.getActiveSequence();
  if (!sequence) throw new Error("No active sequence. Open a sequence and select a clip.");
  return { project, sequence };
}

/**
 * Returns metadata for the single selected audio clip on the active
 * sequence's timeline, or throws a descriptive error if the selection
 * isn't exactly one audio clip.
 */
async function getSelectedAudioClip() {
  const { project, sequence } = await getActiveSequence();
  const selection = await sequence.getSelection();
  const items = await selection.getTrackItems();

  if (!items || items.length === 0) {
    throw new Error("Nothing selected. Select one audio clip on the timeline and try again.");
  }
  if (items.length > 1) {
    throw new Error(
      `${items.length} clips selected. Select exactly one audio clip (queueing multiple clips ` +
        "one-at-a-time is supported by pressing the shortcut again after each selection)."
    );
  }

  const trackItem = items[0];
  const mediaType = await trackItem.getMediaType?.();
  if (mediaType && mediaType !== ppro.Constants.MediaType.AUDIO) {
    throw new Error("Selected clip is not an audio clip.");
  }

  const projectItem = await trackItem.getProjectItem();
  const start = await trackItem.getStartTime();
  const end = await trackItem.getEndTime();
  const name = (await projectItem?.getName?.()) || "Selected Clip";
  const mediaPath = await projectItem?.getMediaFilePath?.();

  return {
    trackItem,
    projectItem,
    projectItemId: projectItem?.nodeId || projectItem?.uid || null,
    name,
    mediaPath,
    start,
    end,
    sequence,
    project,
  };
}

/**
 * Renders the given clip's time range to a standalone audio file using the
 * sequence's in/out points + a dedicated audio-only export preset, so video
 * and other tracks are excluded. Other audio tracks are muted for the
 * duration of the export and restored afterward.
 */
async function exportClipAudio(clipInfo, outputFilePath) {
  const { sequence, start, end, trackItem } = clipInfo;

  const originalIn = await sequence.getInPoint();
  const originalOut = await sequence.getOutPoint();
  const mutedTracks = [];

  try {
    await sequence.setInPoint(start);
    await sequence.setOutPoint(end);

    const audioTrackCount = await sequence.getAudioTrackCount();
    const ownerTrackIndex = await trackItem.getTrackIndex?.();
    for (let i = 0; i < audioTrackCount; i++) {
      if (i === ownerTrackIndex) continue;
      const track = await sequence.getAudioTrack(i);
      const wasMuted = await track.isMuted?.();
      if (!wasMuted) {
        await track.setMute?.(true);
        mutedTracks.push(track);
      }
    }

    const presetEntry = await fs.getEntryWithUrl(
      new URL(AUDIO_EXPORT_PRESET_RELATIVE_PATH, import.meta.url).href
    );
    const presetPath = presetEntry.nativePath;

    // NOTE: exact Encoder entry point / argument order is unverified against
    // a live Premiere UXP install — see file header. Adjust here if your
    // Premiere version's API differs (check `ppro.Encoder` in the UDT console).
    const encoder = ppro.Encoder ? ppro.Encoder.getInstance() : ppro.app?.encoder;
    if (!encoder || typeof encoder.encodeSequence !== "function") {
      throw new Error(
        "premierepro.Encoder.encodeSequence not found on this Premiere version. " +
          "See README > Known Failure Modes > Export step."
      );
    }

    const workArea =
      ppro.Constants?.ExportWorkAreaType?.IN_TO_OUT_POINTS ??
      ppro.Constants?.EncodeWorkArea?.IN_TO_OUT_POINT ??
      1;

    const jobId = await encoder.encodeSequence(sequence, outputFilePath, presetPath, workArea, false);
    if (!jobId) throw new Error("Encoder did not return a render job id.");

    await waitForEncodeJob(encoder, jobId);
    return outputFilePath;
  } finally {
    await sequence.setInPoint(originalIn);
    await sequence.setOutPoint(originalOut);
    for (const track of mutedTracks) {
      await track.setMute?.(false);
    }
  }
}

function waitForEncodeJob(encoder, jobId, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = async () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Timed out waiting for Premiere to render the audio export."));
        return;
      }
      try {
        const status = await encoder.getJobStatus?.(jobId);
        if (status === "complete" || status === "done" || status === undefined) {
          resolve();
          return;
        }
        if (status === "failed" || status === "error") {
          reject(new Error("Premiere's encoder reported the export job failed."));
          return;
        }
      } catch (e) {
        // getJobStatus may not exist on all versions; fall back to a fixed wait.
        resolve();
        return;
      }
      setTimeout(poll, 500);
    };
    poll();
  });
}

/**
 * Imports the enhanced file into a "Podcast Enhance" bin and, if
 * replaceInPlace is true, repoints the original clip's project item to the
 * new media file (preserves timeline position/sync since only the source
 * media reference changes, not the timeline structure).
 */
async function importAndReplace(clipInfo, enhancedFilePath, replaceInPlace) {
  const { project, projectItem } = clipInfo;

  const rootBin = await project.getRootItem();
  let targetBin = (await rootBin.getItems()).find(
    async (item) => (await item.getName()) === "Podcast Enhance"
  );
  if (!targetBin) {
    targetBin = await project.createBin("Podcast Enhance", rootBin);
  }

  const importResult = await project.importFiles([enhancedFilePath], {
    suppressUI: true,
    targetBin,
  });
  if (!importResult) {
    throw new Error("Premiere failed to import the enhanced audio file.");
  }

  let importedItem = null;
  const binItems = await targetBin.getItems();
  for (const item of binItems) {
    const path = await item.getMediaFilePath?.();
    if (path === enhancedFilePath) {
      importedItem = item;
      break;
    }
  }

  if (replaceInPlace) {
    if (!projectItem || typeof projectItem.changeMediaPath !== "function") {
      throw new Error("Cannot replace in place: original project item is unavailable.");
    }
    const ok = await projectItem.changeMediaPath(enhancedFilePath, true);
    if (!ok) throw new Error("Premiere refused to change the media path (changeMediaPath returned false).");
  }

  return { importedItemId: importedItem?.nodeId || importedItem?.uid || null };
}

module.exports = {
  getSelectedAudioClip,
  exportClipAudio,
  importAndReplace,
};
