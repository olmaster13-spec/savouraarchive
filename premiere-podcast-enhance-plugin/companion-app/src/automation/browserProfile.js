const path = require("path");
const os = require("os");
const { chromium } = require("playwright");

const PROFILE_DIR = path.join(os.homedir(), ".podcast-enhance-plugin", "browser-profile");

/**
 * Launches (or reuses) a persistent Chromium profile so login cookies
 * survive between runs — you log into Adobe once (via `npm run setup-login`
 * or the first real job) and never again.
 *
 * Deliberately NOT headless: headless Chromium is more likely to be flagged
 * by bot detection, and this site already 403s plain automated HTTP
 * requests. Instead the window is real but sized small and moved off the
 * visible screen area / minimized, so in practice you never see it without
 * going looking for it.
 */
async function launchPersistentBrowser({ visible = false } = {}) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: visible ? [] : ["--window-position=-2000,0", "--window-size=1280,900"],
  });
  return context;
}

module.exports = { launchPersistentBrowser, PROFILE_DIR };
