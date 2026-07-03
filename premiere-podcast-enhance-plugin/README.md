# Podcast Enhance — Premiere Pro plugin

Select an audio clip on the timeline, hit a shortcut, tweak a couple of
sliders in a small window, and the Adobe Podcast–enhanced version comes back
into your project automatically. No browser tabs, no manual upload/download.

**Read "Known failure modes" and "The fragility tradeoff" before relying on
this.** This automates a website Adobe didn't build an API for. It will
break when Adobe changes their UI, and it was built without a live logged-in
session to verify selectors against — see below for exactly what that means
and how to fix it when it happens.

---

## Why it's built this way

### Why browser automation instead of a real API

Adobe's Enhance Speech has recently been folded into **Firefly Services**,
which does expose a real, documented, versioned REST API
(`audio-video-api.adobe.io`, OAuth Server-to-Server auth, async job/poll
model). That would have been a categorically more stable approach than
scripting a web UI, and it's the first thing this project checked for.

It's not usable here: it's a paid/enterprise entitlement gated behind Adobe
sales, not something you self-serve through the free Adobe Developer
Console for a personal Creative Cloud account. Confirmed against a real
Adobe Developer Console — Firefly Services doesn't appear under "Available
to you," and the console explicitly says disabled services need a sales
conversation. So: browser automation against the free consumer tool at
`podcast.adobe.com`, driving your own logged-in session, is the only path
that doesn't require a procurement process. If your Adobe org ever does get
Firefly Services API access, swapping the backend in
`companion-app/src/automation/adobePodcast.js` for an HTTP client is a
much smaller, much more stable rewrite than anything else here — worth
revisiting later.

### Why UXP instead of CEP

Every existing Premiere scripting tutorial you'll find online is written
against CEP/ExtendScript. As of the current Premiere Pro release, that's
the wrong target: Premiere has moved to UXP as the default extensibility
platform, CEP extensions **no longer load automatically**, and
ExtendScript-based integrations are only supported for a short remaining
window. Building this on CEP would mean shipping something already on its
way out. The `uxp-plugin/` here is a UXP plugin, using the documented
`premierepro` module (`Sequence.getSelection()`,
`ClipProjectItem.changeMediaPath()`, `Project.importFiles()`,
`app.encoder`/`Encoder`).

One real gap UXP has vs. old CEP: **plugin commands can't currently be
bound to a native Premiere keyboard shortcut**, and a panel's own key
listeners only fire while that panel has focus — not useful for "select a
clip and hit a shortcut" when you're not necessarily focused on a small
docked panel. That's why the keyboard shortcut lives in a **separate
always-running companion app** (`companion-app/`) that registers a true
OS-level global hotkey (works regardless of what has focus) and talks to
the UXP panel over a local WebSocket. This also turns out to be a good
home for the "small dedicated parameters window," since it can pop up
independent of Premiere's own window/panel management.

### Architecture

```
 global hotkey (companion app, OS-level)
        │
        ▼
 companion app  ──ws://127.0.0.1:8934──►  UXP panel (inside Premiere)
   - queue                                   - Sequence.getSelection()
   - parameters window                       - app.encoder → export clip audio
   - Playwright automation                   - Project.importFiles()
     (podcast.adobe.com)                     - ClipProjectItem.changeMediaPath()
   - job store / presets
```

1. Hotkey fires → companion app asks the UXP panel what's selected.
2. Panel renders just that clip's time range to a temp WAV (audio-only
   export preset, other audio tracks muted for the duration) and hands the
   path back with a `jobId`.
3. Companion app shows the parameters window, pre-filled with your last
   settings.
4. On confirm, companion app drives a persistent, already-logged-in
   Chromium profile through Adobe Podcast's Enhance Speech flow, streaming
   status back to the window (Uploading… / Processing… / Downloading…). The
   downloaded result is saved as `<original filename>-enhanced.<ext>` in
   the same folder as the original clip's source media (falling back to a
   temp folder if that clip has no linked file on disk, or its folder
   isn't writable — logged loudly either way, never a silent switch).
5. Resulting file path goes back to the UXP panel, which imports it into a
   "Podcast Enhance" bin and, by default, repoints the original clip's
   project item to the enhanced file via `changeMediaPath()` — this
   preserves timeline position/trim/sync because only the underlying media
   reference changes, not the timeline structure. Every place that source
   clip appears in the project updates, same as Premiere's own "Replace
   Footage."
6. First time you do a replace, a confirmation dialog explains exactly
   what's about to happen. After that it proceeds automatically (per the
   spec). Undo in Premiere's Edit History still works.

### File-matching logic

There's no filename parsing or fuzzy matching anywhere in this pipeline —
it doesn't need it. The UXP panel generates the `jobId` at the moment you
select a clip and keeps an in-memory (and companion-app-persisted) map of
`jobId → project item reference` for the entire round trip. When the
enhanced file comes back, it's matched by that `jobId`, not by name. This
also means two clips with identical filenames are never ambiguous.

---

## Install

### Prerequisites
- Premiere Pro with UXP plugin support (current release).
- Node.js 18+.
- An Adobe account, logged into `podcast.adobe.com` in a normal browser at
  least once (you'll do this again inside the automation's own profile,
  see below).

### 1. Companion app
```bash
cd companion-app
npm install
npx playwright install chromium   # one-time, downloads the automation's browser
npm start                          # runs in the background / system tray from now on
```
The companion app lives in your tray/menu bar. Right-click it to see
connection status, change the shortcut, re-run login setup, or quit.
Default shortcut: `Ctrl/Cmd+Shift+P` (change it in
`companion-app/src/lib/settingsStore.js` → `hotkey`, or via the tray menu
once wired to a settings UI — v1 ships with the config-file route). Note
that `Cmd/Ctrl+Shift+P` is a "command palette" shortcut in several other
apps (VS Code, Slack, etc.) — those are in-app bindings, not OS-level
global ones, so they normally don't conflict with this being a true global
hotkey, but if something else on your system *does* register it globally
first, `globalShortcut.register()` fails and the companion app logs
`Failed to register global shortcut` rather than pretending it worked —
check the terminal/tray tooltip if the shortcut seems to do nothing.

**Logging into Adobe:** you don't need a separate setup step. The
automation runs in its own small, real (not headless) Chromium window that
normally sits tucked in a corner of your screen, out of the way. The first
time it needs to talk to `podcast.adobe.com` and finds you're not logged
in — or any time your session expires later — it pauses the job, moves
that window front-and-center so you can't miss it, and waits for you to
sign in by hand, right then, the same as you would in any browser. Once
you're in, it shrinks back to its corner and the job continues. If you'd
rather get login out of the way ahead of time instead of mid-job, run
`npm run setup-login`, which does the same thing standalone.

### 2. Export preset (one-time)
The audio export step needs a Premiere `.epr` preset — see
`uxp-plugin/presets/README.md` for the 2-minute steps to generate one from
Premiere's own Export dialog and drop it in place.

### 3. UXP plugin
1. Install the [UXP Developer Tool](https://developer.adobe.com/xd/uxp/devtool/) (UDT).
2. In UDT, "Add Plugin" → point it at `uxp-plugin/manifest.json`.
3. Load it into Premiere. `Window > Podcast Enhance` opens the panel.
4. Keep the panel open (doesn't need focus) — it must be loaded for the
   companion app to reach it.

### 4. Use it
Select an audio clip on the timeline → press the shortcut → adjust sliders
in the window that appears → confirm → watch the status update → enhanced
audio lands in the project and (by default) replaces the original in place.

---

## Parameter set exposed

Verified against Enhance Speech's current (v2, March update) public
description — no voice/gender selector exists, that's not a real control
on this tool:

| Control | Range | Notes |
|---|---|---|
| **Enhance strength** | 0–100% | Blend of original vs. fully-enhanced. Adobe's own guidance: 100% often sounds over-processed; most land around 30–50%. |
| **Speech** | 0–100% | v2 independent stem control. |
| **Noise** | 0–100% | v2 independent stem control — rebalance/mute background noise separately from voice. |
| **Music** | 0–100% | v2 independent stem control — same, for background music. |

The automation feature-detects the v2 stem sliders and skips them
gracefully (applying only strength) if they're not present on the page —
in case that rollout varies by account/region.

---

## Known failure modes

Ranked by how likely they are to actually bite you:

1. **Selectors go stale.** `companion-app/src/automation/selectors.js` was
   written from public descriptions of the site, **not a live authenticated
   session** — every selector in it is explicitly marked best-effort and
   needs verification. Run `npm run capture-selectors` (records real
   selectors via `playwright codegen` against the logged-in profile) the
   first time you use this, and any time a step starts failing. This is the
   #1 expected maintenance task — the plugin is designed to fail loudly
   with the exact step name and the raw error so you're never guessing
   which part broke.
2. **The Premiere UXP encoder call.** `premiereActions.js`'s
   `exportClipAudio()` calls into `premierepro`'s encoder API, which is the
   least-documented corner of UXP as of this writing. The exact entry point
   name/argument order is marked in code as needing verification against
   your installed Premiere version — if export fails immediately, check
   this first (open the UDT console and inspect `require("premierepro")`
   to confirm the real method names).
3. **Login expiring.** Adobe sessions can time out. The automation detects
   "not logged in," moves the browser window front-and-center, and waits up
   to 5 minutes for you to sign in by hand — if a job seems stuck, that's
   the most likely reason, so check for the window (it may have popped up
   behind Premiere rather than in front of it, depending on your OS's
   focus-stealing rules). `npm run setup-login` does the same thing
   standalone if you'd rather handle it outside of a real job.
4. **Bot detection / CAPTCHA.** The site already blocks plain automated
   HTTP fetches (confirmed during this plugin's own research — every
   non-browser fetch to `podcast.adobe.com` came back 403). A real,
   persistent-profile Chromium session behaves like a normal browser and
   should be fine for personal use at low volume, but if Adobe tightens
   bot detection this is the most likely new failure point, and there's no
   graceful workaround beyond waiting it out or re-verifying manually.
5. **Panel not loaded.** If the UXP panel isn't open in Premiere, the
   companion app can't ask it anything — you'll get a clear
   "Premiere panel not connected" notification, not a silent no-op.
6. **Long clips timing out.** Processing timeouts are generous (6 minutes)
   but very long files may need `selectors.js`'s `processingTimeoutMs`
   raised.

None of these fail silently — every stage is wrapped so the parameters
window (or a system notification, for early failures) names the exact step
and the raw underlying error, with a Retry button that resumes from that
step rather than re-running the whole pipeline.

---

## The fragility tradeoff — please read this

This plugin's core mechanism is a headed browser clicking through Adobe's
consumer web app the same way you would. That is inherently coupled to
Adobe's current DOM and flow. It **will** need maintenance when Adobe
changes their site — that's not a hypothetical edge case, it's the normal
operating condition of this kind of tool. The selector-capture workflow
above is designed to make that maintenance a 10-minute task instead of a
rewrite, but it is still a recurring cost, not a one-time setup.

If Adobe ever opens self-serve access to the Firefly Services Audio/Video
API for your account, migrate to it — see "Why browser automation instead
of a real API" above for exactly what would need to change (isolated to
`automation/adobePodcast.js`; nothing else in the pipeline depends on how
that module gets its enhanced audio).

## A note on Terms of Service

This automates your own logged-in Adobe account clicking through Enhance
Speech's normal UI — no auth bypass, no scraping of other users' data, no
mass/automated traffic beyond what you'd generate by hand. That's a
meaningfully different risk profile than scraping. That said, consumer web
app Terms of Use commonly include boilerplate restricting "automated
means" of access regardless of intent, and this project could not retrieve
Adobe's current Terms of Use text to check for such a clause (it 403s
automated fetches, same as the rest of the site). Read Adobe's current
General Terms of Use yourself before relying on this, and treat it as a
personal productivity tool for your own account — not something to run at
scale or distribute as a service.

---

## Project layout

```
uxp-plugin/                  Premiere UXP panel
  manifest.json
  index.html, css/, js/
    premiereActions.js       getSelection / export / import+replace
    wsClient.js               connects to companion app
  presets/                    put your generated .epr export preset here

companion-app/                Background tray app
  src/
    main.js                  tray, global hotkey, app lifecycle
    orchestrator.js          the job pipeline + retry/resume logic
    windowManager.js         the parameters/progress window
    server/wsServer.js       local WS bridge to the UXP panel
    server/jobStore.js       persisted job state (survives restarts)
    automation/
      adobePodcast.js        Playwright driver for podcast.adobe.com
      selectors.js           ⚠ best-effort, verify before relying on it
      browserProfile.js      persistent logged-in Chromium profile
    lib/settingsStore.js     hotkey, presets, last-used params
    windows/params/          the small dedicated parameters window (HTML/JS)
  scripts/
    setup-login.js           optional standalone Adobe login (also happens inline on first use)
    capture-selectors.js     re-record selectors when the site changes
```

## v2 ideas not built yet
- Settings UI for the hotkey/port instead of editing `settingsStore.js`
  defaults directly.
- Multi-job visual queue in the tray menu (the pipeline already processes
  a backlog sequentially — `orchestrator.js` — there's just no UI listing
  what's queued).
- Auto-detecting Firefly Services API availability and offering to switch
  backends if your account ever gets access.
