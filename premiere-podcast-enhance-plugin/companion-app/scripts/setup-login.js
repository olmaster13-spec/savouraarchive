/**
 * Optional, standalone way to sign into Adobe ahead of time. You don't
 * strictly need this — if you skip it, the first time the shortcut hits a
 * clip and the automation finds itself logged out, it pauses the job,
 * pulls the browser window front-and-center, and waits for you to sign in
 * right there (see ensureLoggedIn() in automation/adobePodcast.js). Run
 * this instead if you'd rather get login out of the way first, or need to
 * re-authenticate without spending a real job on it.
 *
 * Usage: npm run setup-login
 */

const { launchPersistentBrowser, bringToAttention } = require("../src/automation/browserProfile");
const sel = require("../src/automation/selectors");

(async () => {
  console.log("Opening browser — sign into your Adobe account, then leave the window open.");
  console.log("This script exits automatically once it detects you're signed in.\n");

  const context = await launchPersistentBrowser();
  const page = await context.newPage();
  await page.goto(sel.enhanceSpeechUrl, { waitUntil: "domcontentloaded" });
  await bringToAttention(page);

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
