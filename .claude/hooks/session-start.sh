#!/bin/bash
# SessionStart hook for Claude Code on the web: installs the toolchain so
# check/lint/test/e2e are runnable right away, and surfaces the repo skills.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
	exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Install logs go to stderr: stdout is injected into the session context.
npm install --no-audit --no-fund >&2

# The web image ships Chromium and blocks the Playwright CDN, so never run
# `playwright install` here — point playwright.config.ts at the bundled one.
chromium="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium"
if [ -x "$chromium" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
	echo "export PLAYWRIGHT_CHROMIUM_PATH=$chromium" >>"$CLAUDE_ENV_FILE"
fi

skills=$(find .claude/skills -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | paste -sd , - | sed 's/,/, /g')

cat <<CONTEXT
Repository skills are vendored in .claude/skills/ and MUST be used: $skills.

Load svelte-code-writer and svelte-core-bestpractices before creating, editing
or analyzing any .svelte / .svelte.ts file, and follow the skill itself — its
instructions and examples, not just \`npx @sveltejs/mcp svelte-autofixer <file>\`,
which every component must still pass before it is finalized.
CONTEXT
