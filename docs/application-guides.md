# Application Guides

This document replaces the legacy website guide pages for the `csdm-lite` fork. The project is now documented directly in the repository.

## Demo Analysis

### The Demo Source Is Not Supported

`csdm-lite` can analyze demos that the embedded parser understands. If a demo is rejected because its source is not supported, the usual causes are:

- the demo comes from a platform or build variant that the current parser does not support
- the demo file is incomplete or corrupted
- the demo was produced by a game update newer than the parser support included in the current build

Recommended actions:

- verify the demo opens in Counter-Strike
- update to the latest `csdm-lite` release
- retry the analysis after re-downloading the demo

### Analysis Errors

When analysis fails, first read the error code shown in the application and inspect the generated logs. In this fork:

- parser or import errors should be reported with the error code and logs attached
- duplicate checksum errors usually mean the same demo already exists in the local database
- playback-related errors are documented in the playback section below

If a report is needed, use the bug report template in the repository issues page and include:

- application version
- operating system
- demo source
- error code
- relevant logs

## Playback

`csdm-lite` uses a local SQLite database and local Counter-Strike installation. Playback problems are usually caused by game updates, unsupported paths, missing prerequisites, or plugin compatibility.

### CS2 Plugin Compatibility

If an older demo cannot be watched with the latest CS2 build, select a plugin version compatible with the historical game version used by that demo. When a beta branch is required, match the application setting with the Counter-Strike branch installed in Steam.

### CS2 Demo Playback Does Not Start Or Crashes

Check the following:

- Steam is running and Counter-Strike is installed
- the demo path contains only basic Latin characters
- the selected CS2 plugin version matches the target demo era when watching older demos
- no anti-cheat or overlay tool is blocking launch
- the game has been started at least once from Steam on the current machine

If playback still fails, collect logs and open an issue.

## 2D Viewer

The 2D viewer can run without audio. Audio playback requires an existing audio file or a generated voice export.

### Audio Playback

For demos that contain usable voice data, the app can generate a `.wav` file next to the demo. If no embedded voice data exists, choose an external audio file manually.

Limitations:

- Valve Matchmaking demos may not contain usable voice audio data
- unsupported demo formats may fail during audio extraction
- missing external libraries can prevent export on some platforms

## Video

Video generation still depends on the local game, FFmpeg, and optional external tools such as HLAE or VirtualDub depending on the selected workflow. Before rendering:

- confirm the demo plays correctly
- verify output paths are writable
- verify required tools are installed and configured
- use settings compatible with the selected Counter-Strike version

## Maps

Custom maps can be added manually when radar assets and calibration values are known.

### Adding Or Editing A Map

Prepare the following:

- map name
- radar image
- optional lower radar image
- thumbnail image
- calibration values: `posX`, `posY`, `scale`, and when needed `thresholdZ`

After saving, verify the radar alignment in the 2D viewer.

## Cameras

Camera presets are stored locally in the SQLite-backed application data. A camera can be created manually or captured from an in-game view. For reliable capture:

- launch the correct game and map from the application
- wait until the map is fully loaded
- retry capture if the preview image or coordinates are missing

## Downloads

Some legacy download flows remain documented for historical context.

### Why FACEIT Downloads Are Disabled

The FACEIT download command is currently disabled in this fork. Upstream service behavior and authentication constraints make it unreliable for long-term maintenance. If this changes in the future, the command can be re-enabled with an implementation that is stable for `csdm-lite`.
