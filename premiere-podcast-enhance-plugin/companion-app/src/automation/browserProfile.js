const path = require("path");
const os = require("os");
const { chromium } = require("playwright");
const { screen } = require("electron");

const PROFILE_DIR = path.join(os.homedir(), ".podcast-enhance-plugin", "browser-profile");

const CORNER_SIZE = { width: 480, height: 640 };
const ATTENTION_SIZE = { width: 1280, height: 900 };

/**
 * Launches (or reuses) a persistent Chromium profile so login cookies
 * survive between runs — you log into Adobe once (via `npm run setup-login`,
 * or just by using the shortcut normally: if a job hits Adobe's login page,
 * `adobePodcast.js` calls bringToLoginAttention() below to make this window
 * impossible to miss) and never again until the session actually expires.
 *
 * Deliberately NOT headless: headless Chromium is more likely to be flagged
 * by bot detection, and this site already 403s plain automated HTTP
 * requests. Instead it's a real, genuinely on-screen window, just small and
 * tucked in a corner during normal (already-logged-in) runs so it doesn't
 * steal your attention — as opposed to positioned off-screen, which would
 * also hide it during the one moment you actually need to see it (signing
 * back in).
 */
async function launchPersistentBrowser({ corner = getCornerPosition() } = {}) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null, // let --window-size drive the actual OS window size
    args: [
      `--window-position=${corner.x},${corner.y}`,
      `--window-size=${CORNER_SIZE.width},${CORNER_SIZE.height}`,
    ],
  });
  return context;
}

function getCornerPosition() {
  try {
    const { workArea } = screen.getPrimaryDisplay();
    return {
      x: workArea.x + workArea.width - CORNER_SIZE.width - 10,
      y: workArea.y + workArea.height - CORNER_SIZE.height - 10,
    };
  } catch {
    // automation modules can run outside the Electron main process (e.g.
    // scripts/setup-login.js via `node`, not `electron`) where `electron`'s
    // screen module isn't available — fall back to a fixed offset.
    return { x: 100, y: 100 };
  }
}

/**
 * Moves the automation window front-and-center and focuses it. Call this
 * whenever the user actually needs to look at/interact with the page (login
 * required, an unrecoverable site error, etc.) — the corner position it
 * normally sits in is easy to miss on purpose.
 */
async function bringToAttention(page) {
  const client = await page.context().newCDPSession(page);
  const { windowId } = await client.send("Browser.getWindowForTarget");
  await client.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: 80, top: 80, width: ATTENTION_SIZE.width, height: ATTENTION_SIZE.height, windowState: "normal" },
  });
  await page.bringToFront();
}

/** Shrinks the window back to its unobtrusive corner position. */
async function returnToCorner(page) {
  const client = await page.context().newCDPSession(page);
  const { windowId } = await client.send("Browser.getWindowForTarget");
  const corner = getCornerPosition();
  await client.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: corner.x, top: corner.y, width: CORNER_SIZE.width, height: CORNER_SIZE.height, windowState: "normal" },
  });
}

module.exports = { launchPersistentBrowser, bringToAttention, returnToCorner, PROFILE_DIR };
