#!/usr/bin/env node
/**
 * Refuse a production build into .next while the dev server is running.
 * Mixing dev + production artifacts in the same distDir causes missing-chunk errors.
 */
import { execSync } from 'node:child_process';

const distDir = process.env.NEXT_DIST_DIR || '.next';
const devPort = process.env.TRUSTOPS_DEV_PORT || '3001';

function devServerRunning() {
  try {
    execSync(`ss -tlnp 2>/dev/null | grep -E ':${devPort}[^0-9]'`, { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync(`lsof -i :${devPort} -sTCP:LISTEN`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

if (distDir === '.next' && devServerRunning()) {
  console.error(`
Cannot run \`npm run build\` while the dev server is on port ${devPort}.

The dev server writes to frontend/.next-dev; production build uses frontend/.next.
Running both against the same folder corrupts chunks (blank pages, "Cannot find module").

Options:
  • Stop dev first, then build:  npm run build
  • Safe check with dev running:  npm run build:check
  • Fresh dev restart:            npm run dev:fresh
`);
  process.exit(1);
}
