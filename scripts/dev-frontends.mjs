import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const applications = [
  { name: 'Login', directory: 'frontend', packageName: 'frontend', port: 5173 },
  { name: 'Portal', directory: 'frontend/portal', packageName: '@teky/portal', port: 3000 },
  { name: 'Backoffice', directory: 'frontend/backoffice', packageName: '@teky/backoffice', port: 3001 },
];
const children = [];
let stopping = false;

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

async function alreadyRunning(application) {
  try {
    const response = await fetch(`http://localhost:${application.port}/package.json`, {
      signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) return false;
    const metadata = await response.json();
    return metadata.name === application.packageName;
  } catch {
    return false;
  }
}

try {
  for (const application of applications) {
    if (stopping) break;
    if (await alreadyRunning(application)) {
      console.log(`[${application.name}] Running at http://localhost:${application.port}`);
      continue;
    }

    const directory = join(root, application.directory);
    const require = createRequire(join(directory, 'package.json'));
    const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
    console.log(`[${application.name}] Starting http://localhost:${application.port}`);
    const child = spawn(process.execPath, [vite], {
      cwd: directory,
      stdio: 'inherit',
      windowsHide: true,
    });
    children.push(child);
    child.on('error', error => {
      console.error(`[${application.name}] ${error.message}`);
      stop(1);
    });
    child.on('exit', (code, signal) => {
      if (stopping) return;
      console.error(`[${application.name}] Stopped (${signal ?? code ?? 'unknown'}).`);
      stop(code || 1);
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop(1);
}
