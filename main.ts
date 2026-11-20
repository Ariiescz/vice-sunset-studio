// Entrypoint for Vice Sunset Studio: a GTA 6-style cover art maker that runs
// as a small static web app. This script packages the app for delivery: it
// copies the app/ tree (and the screenshots/ tree when present) next to itself
// into the publish directory, then records a build dossier describing the
// bundle. Node 22, standard library only.

import { mkdirSync, cpSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// --------------------------------------------------------------------- paths

/** Folder this script lives in, derived from its own module URL. */
const scriptDir = dirname(fileURLToPath(import.meta.url));

/** Where the packaged app is written: MAKEFUN_OUTPUT_DIR, or /output by default. */
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// --------------------------------------------------------------- dossier caps

// Contract limits from the bounty's gate.json, quoted in UTF-8 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

// ------------------------------------------------------------------ helpers

/** Copy a source sub-tree into the output dir; returns true when it existed. */
function stageDirectory(name) {
  const from = join(scriptDir, name);
  if (!existsSync(from)) return false;
  cpSync(from, join(outputDir, name), { recursive: true });
  return true;
}

// -------------------------------------------------------------------- main

function main() {
  mkdirSync(outputDir, { recursive: true });

  stageDirectory('app');
  stageDirectory('screenshots');

  const dossier = buildDossier(outputDir, CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

main();
