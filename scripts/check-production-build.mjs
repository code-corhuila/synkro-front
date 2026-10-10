#!/usr/bin/env node
// Fails when a production build still carries the development sign-in.
//
// The development sign-in (a pasted token becomes a session) is replaced by
// synkro-auth-portal and must never reach `main`. A build with
// VITE_DEV_SIGN_IN off drops it, together with the key it stores a session
// under; this script is what keeps that true. CI runs it on the build job, and
// the Dockerfile builds with the flag off.
//
//   node scripts/check-production-build.mjs [directory]   (default: dist)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Strings only the development sign-in has: the storage key, the field id and
// the Spanish text of its form. The dev styles stay in the CSS bundle, so the
// check reads scripts and pages only.
export const DEV_SIGN_IN_MARKERS = [
  'synkro_dev_token',
  'dev-token',
  'Token de desarrollo',
  'Ese token de desarrollo no es válido.',
  'Esta pantalla solo existe en compilaciones de desarrollo.',
];

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

// Every marker found in a script or page of the build, with the file it is in.
export function findDevSignInMarkers(directory) {
  if (!existsSync(directory)) {
    throw new Error(`No build to check at ${directory}. Run the build first.`);
  }
  const files = filesUnder(directory).filter((file) => /\.(?:js|mjs|html)$/.test(file));
  if (files.length === 0) {
    throw new Error(`${directory} has no scripts or pages to check.`);
  }
  return files.flatMap((file) => {
    const content = readFileSync(file, 'utf8');
    return DEV_SIGN_IN_MARKERS.filter((marker) => content.includes(marker)).map((marker) => ({ file, marker }));
  });
}

function main() {
  const directory = process.argv[2] ?? 'dist';
  try {
    const findings = findDevSignInMarkers(directory);
    if (findings.length === 0) {
      console.log(`${directory}: no development sign-in code or storage key found.`);
      return 0;
    }
    console.error(`${directory}: the build still contains the development sign-in:`);
    for (const { file, marker } of findings) console.error(`  ${marker}  in  ${file}`);
    console.error('Build with VITE_DEV_SIGN_IN unset or not "true".');
    return 1;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
