/**
 * Launches Playwright's codegen recorder against the real site, using the
 * same persistent profile the automation uses, so you're already logged
 * in. Click through a real upload -> set parameters -> download cycle;
 * codegen prints the real selectors/actions it observed to the terminal
 * (and optionally to captured-actions.js if you pass -o).
 *
 * Use this to populate/refresh src/automation/selectors.js whenever the
 * automation starts failing.
 *
 * Usage: npm run capture-selectors
 */

const { spawn } = require("child_process");
const path = require("path");
const { PROFILE_DIR } = require("../src/automation/browserProfile");
const sel = require("../src/automation/selectors");

const outFile = path.join(__dirname, "captured-actions.js");

console.log(`Recording against the persistent profile at:\n  ${PROFILE_DIR}`);
console.log(`Output will be written to:\n  ${outFile}\n`);
console.log(
  "Click through: upload a file, adjust every slider, wait for the download button, click download.\n" +
    "Then close the recorder window. Copy the real selectors it captured into selectors.js.\n"
);

const child = spawn(
  "npx",
  [
    "playwright",
    "codegen",
    `--user-data-dir=${PROFILE_DIR}`,
    "--target=javascript",
    `-o=${outFile}`,
    sel.enhanceSpeechUrl,
  ],
  { stdio: "inherit", shell: true }
);

child.on("exit", (code) => {
  process.exit(code || 0);
});
