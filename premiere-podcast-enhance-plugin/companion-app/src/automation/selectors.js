/**
 * ==========================================================================
 *  EVERY selector in this file is best-effort, inferred from public
 *  descriptions of podcast.adobe.com — NOT verified against a live,
 *  logged-in session (this plugin was built without access to one). It WILL
 *  need correction before the automation is reliable.
 *
 *  Fix it in ~10 minutes:
 *    cd companion-app && npm run capture-selectors
 *  This opens the real site in the persistent profile via
 *  `playwright codegen`; click through an actual upload/enhance/download
 *  once, then copy the real selectors it records into the fields below.
 *
 *  Re-do this any time the automation starts failing — a changed selector
 *  is the single most likely cause (see README > Known Failure Modes).
 * ==========================================================================
 */

module.exports = {
  enhanceSpeechUrl: "https://podcast.adobe.com/en/enhance",

  // Signed-in state detection
  accountMenu: '[data-testid="account-menu"], header [aria-label*="account" i], img[alt*="avatar" i]',
  signInButton: 'button:has-text("Sign in"), a:has-text("Sign in")',

  // Upload
  fileInput: 'input[type="file"]',
  dropZone: '[data-testid="dropzone"], [class*="dropzone" i], [class*="upload" i]',

  // Parameter controls (Enhance Speech v2, March 2026 update)
  strengthSlider: '[data-testid="enhance-strength-slider"], [aria-label*="strength" i][role="slider"]',
  speechSlider: '[data-testid="speech-slider"], [aria-label*="speech" i][role="slider"]',
  noiseSlider: '[data-testid="noise-slider"], [aria-label*="noise" i][role="slider"]',
  musicSlider: '[data-testid="music-slider"], [aria-label*="music" i][role="slider"]',

  // Processing / completion
  processingIndicator: '[data-testid="processing-indicator"], [class*="progress" i], [class*="spinner" i]',
  errorBanner: '[data-testid="error-banner"], [role="alert"]',

  // Download
  downloadButton: 'button:has-text("Download"), [data-testid="download-button"]',

  // Timeouts (ms) — generous because processing time scales with clip length
  uploadTimeoutMs: 2 * 60 * 1000,
  processingTimeoutMs: 6 * 60 * 1000,
};
