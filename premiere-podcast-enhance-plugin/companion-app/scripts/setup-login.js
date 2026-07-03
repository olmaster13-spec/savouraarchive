/**
 * One-time (or occasional, if Adobe logs you out) manual login step.
 * Opens the persistent browser profile the automation reuses on every
 * run, visibly this time, and waits for you to sign into Adobe by hand.
 *
 * Usage: npm run setup-login
 */

const { launchPersistentBrowser } = require("../src/automation/browserProfile");
const sel = require("../src/automation/selectors");

(async () => {
  console.log("Opening browser — sign into your Adobe account, then leave the window open.");
  console.log("This script exits automatically once it detects you're signed in.\n");

  const context = await launchPersistentBrowser({ visible: true });
  const page = await context.newPage();
  await page.goto(sel.enhanceSpeechUrl, { waitUntil: "domcontentloaded" });
  await page.bringToFront();

  try {
    await page.locator(sel.accountMenu).first().waitFor({ state: "visible", timeout: 10 * 60 * 1000 });
    console.log("\nSigned in. Session saved to the persistent profile — you're done.");
  } catch {
    console.error(
      "\nTimed out after 10 minutes without detecting a signed-in state.\n" +
        "Either you didn't finish signing in, or selectors.accountMenu is stale " +
        "(run `npm run capture-selectors` to check)."
    );
  } finally {
    await context.close();
  }
})();
