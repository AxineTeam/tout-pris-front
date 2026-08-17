#!/bin/bash
# SessionStart hook for Claude Code on the web: installs the toolchain so
# check/lint/test/e2e are runnable right away. Skills are not advertised here —
# Claude Code lists them from .claude/skills/ and loads each one when its own
# description matches the task.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
	exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Logs go to stderr: whatever this hook prints on stdout lands in the session
# context, and an install trace has nothing to do there.
npm install --no-audit --no-fund >&2

# The web image ships Chromium and blocks the Playwright CDN, so never run
# `playwright install` here — point playwright.config.ts at the bundled one.
chromium="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium"
if [ -x "$chromium" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
	echo "export PLAYWRIGHT_CHROMIUM_PATH=$chromium" >>"$CLAUDE_ENV_FILE"
fi
