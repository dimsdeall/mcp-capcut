# capcut-mcp

## 0.3.0

### Minor Changes

- ea3db21: Six new tools: `add_subtitles` (SRT import), `open_draft` (edit saved drafts), `edit_segment`, `remove_segment`, `audio_fade`, and `set_background`. The server version reported over MCP now follows package.json.
- 1354a78: Require Node.js 24+: engines bumped, CI and release workflows now run on Node 24.

### Patch Changes

- 702cf70: Windows support: resolve the default CapCut drafts folder from %LOCALAPPDATA% on Windows instead of always using the macOS path.

## 0.2.1

### Patch Changes

- 6dfc1ca: Support running via `npx -y github:dimsdeall/mcp-capcut`: add `prepare` build script and `files` field so npx can install and build straight from the GitHub repo.

## 0.2.0

### Minor Changes

- 9247b8d: Initial MCP server release: build CapCut desktop drafts (video, audio, text) by writing draft_content.json directly, with changesets-based release automation.
