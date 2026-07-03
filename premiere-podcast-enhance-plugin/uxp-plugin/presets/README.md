# Export preset required here

Premiere's encoder API renders using an `.epr` preset file, not inline
parameters. `.epr` files are Premiere's own binary/XML export-preset format
and can't be authored by hand — you generate one from Premiere itself, once:

1. In Premiere, `File > Export > Media`.
2. Format: **Waveform Audio (WAV)** (or AIFF if you prefer — just stay
   consistent, Adobe Podcast accepts both). Uncheck/omit video entirely.
3. Sample rate/bit depth: match your project's audio settings (typically
   48kHz / 24-bit) so the exported clip isn't resampled before it hits
   Enhance Speech.
4. Click **Save Preset...**, name it, then find the generated `.epr` file
   (Premiere stores presets under
   `~/Documents/Adobe/Premiere Pro/<version>/Export Presets/` on macOS or
   the equivalent AppData path on Windows).
5. Copy that `.epr` file into this folder as `audio-wav-48k24bit.epr`
   (or update `AUDIO_EXPORT_PRESET_RELATIVE_PATH` in
   `uxp-plugin/js/premiereActions.js` to match whatever you name it).

This is a one-time, per-machine setup step — see the main README's
install instructions.
