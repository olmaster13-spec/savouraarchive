const path = require("path");
const sel = require("./selectors");
const { launchPersistentBrowser, bringToAttention, returnToCorner } = require("./browserProfile");

class AutomationError extends Error {
  constructor(step, message) {
    super(`[${step}] ${message}`);
    this.step = step;
  }
}

/**
 * Drives podcast.adobe.com's Enhance Speech tool end-to-end for one file.
 * Every step is wrapped so a failure names the exact step it happened in
 * (per the "fail loudly" requirement) instead of a generic timeout error.
 *
 * @param {object} opts
 * @param {string} opts.inputPath - local audio file to upload
 * @param {string} opts.outputDir - directory to save the downloaded result into
 * @param {{strength:number, speech:number, noise:number, music:number}} opts.params
 * @param {(stage: string, message: string) => void} opts.onProgress
 */
async function enhance({ inputPath, outputDir, params, onProgress = () => {} }) {
  const context = await launchPersistentBrowser();
  const page = await context.newPage();

  try {
    onProgress("opening", "Opening Adobe Podcast…");
    await page.goto(sel.enhanceSpeechUrl, { waitUntil: "domcontentloaded" });

    await ensureLoggedIn(page, onProgress);

    onProgress("uploading", "Uploading clip…");
    await uploadFile(page, inputPath);

    onProgress("configuring", "Applying parameters…");
    await applyParams(page, params);

    onProgress("processing", "Waiting for Adobe to process the clip…");
    await waitForProcessingComplete(page);

    onProgress("downloading", "Downloading enhanced audio…");
    const downloadedPath = await downloadResult(page, outputDir, inputPath);

    onProgress("done", "Enhanced audio downloaded.");
    return downloadedPath;
  } finally {
    await context.close().catch(() => {});
  }
}

async function ensureLoggedIn(page, onProgress) {
  const loggedIn = await page
    .locator(sel.accountMenu)
    .first()
    .isVisible({ timeout: 8000 })
    .catch(() => false);
  if (loggedIn) return;

  const signInVisible = await page
    .locator(sel.signInButton)
    .first()
    .isVisible({ timeout: 4000 })
    .catch(() => false);

  if (!signInVisible) {
    // Neither signed-in nor signed-out markers matched — selectors are
    // likely stale. Don't guess; fail loudly with guidance.
    throw new AutomationError(
      "login-check",
      "Couldn't determine login state — selectors.accountMenu/signInButton probably need updating " +
        "(run `npm run capture-selectors`)."
    );
  }

  onProgress("login-required", "Not logged in. Bringing the browser window forward — please sign in.");
  // The window normally sits small, in a corner, out of your way. Actually
  // move/resize it front-and-center here — bringToFront() alone only
  // focuses the tab, it won't undo the corner position, and you'd never
  // see a prompt to sign into.
  await bringToAttention(page);
  try {
    await page.locator(sel.accountMenu).first().waitFor({ state: "visible", timeout: 5 * 60 * 1000 });
    onProgress("login-required", "Signed in — continuing.");
    await returnToCorner(page).catch(() => {});
  } catch {
    throw new AutomationError("login", "Timed out waiting for manual sign-in (5 min). Retry once you've signed in.");
  }
}

async function uploadFile(page, inputPath) {
  try {
    const input = page.locator(sel.fileInput).first();
    await input.waitFor({ state: "attached", timeout: sel.uploadTimeoutMs });
    await input.setInputFiles(inputPath);
  } catch (err) {
    throw new AutomationError("upload", `Could not find/use the file input (${err.message}). Selector likely stale.`);
  }
}

async function setSliderValue(page, selector, targetPercent, label) {
  const slider = page.locator(selector).first();
  const visible = await slider.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) {
    // Non-fatal: v2 stem sliders may not exist for all accounts/rollouts.
    return false;
  }
  const box = await slider.boundingBox();
  if (!box) return false;

  const clampedPercent = Math.max(0, Math.min(100, targetPercent));
  const targetX = box.x + box.width * (clampedPercent / 100);
  const targetY = box.y + box.height / 2;

  await slider.hover();
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();

  const actual = await slider.getAttribute("aria-valuenow").catch(() => null);
  if (actual !== null && Math.abs(Number(actual) - clampedPercent) > 5) {
    throw new AutomationError(
      "params",
      `Dragging the "${label}" slider landed on ${actual}%, expected ~${clampedPercent}%. ` +
        "Layout likely changed — verify selectors.js."
    );
  }
  return true;
}

async function applyParams(page, params) {
  await setSliderValue(page, sel.strengthSlider, params.strength, "strength");
  await setSliderValue(page, sel.speechSlider, params.speech, "speech");
  await setSliderValue(page, sel.noiseSlider, params.noise, "noise");
  await setSliderValue(page, sel.musicSlider, params.music, "music");
}

async function waitForProcessingComplete(page) {
  await page
    .locator(sel.processingIndicator)
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {
      // Some clips process fast enough that the indicator flashes by
      // before this check runs — not itself an error.
    });

  const errorBanner = page.locator(sel.errorBanner).first();
  const downloadBtn = page.locator(sel.downloadButton).first();

  const result = await Promise.race([
    downloadBtn
      .waitFor({ state: "visible", timeout: sel.processingTimeoutMs })
      .then(() => "success"),
    errorBanner
      .waitFor({ state: "visible", timeout: sel.processingTimeoutMs })
      .then(() => "site-error"),
  ]).catch(() => "timeout");

  if (result === "timeout") {
    throw new AutomationError(
      "processing",
      `Adobe didn't finish (or signal completion) within ${sel.processingTimeoutMs / 1000}s. ` +
        "Either the clip is unusually long, or selectors.downloadButton/processingIndicator are stale."
    );
  }
  if (result === "site-error") {
    const text = await errorBanner.innerText().catch(() => "(no message)");
    throw new AutomationError("processing", `Adobe Podcast reported an error: ${text}`);
  }
}

async function downloadResult(page, outputDir, inputPath) {
  const downloadBtn = page.locator(sel.downloadButton).first();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }).catch((err) => {
      throw new AutomationError("download", `No download started after clicking Download (${err.message}).`);
    }),
    downloadBtn.click(),
  ]);

  const base = path.parse(inputPath).name;
  const suggested = download.suggestedFilename();
  const ext = path.extname(suggested) || ".wav";
  const destPath = path.join(outputDir, `${base}-enhanced${ext}`);

  await download.saveAs(destPath);
  return destPath;
}

module.exports = { enhance, AutomationError };
