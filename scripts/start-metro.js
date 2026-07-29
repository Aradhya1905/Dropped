/**
 * Starts Metro on the first available port.
 *
 * Order of port selection:
 *   1. --port <n> / -p <n> CLI arg, or RCT_METRO_PORT / PORT env var (preferred port)
 *   2. scripts/metro-defaults.json "port" field (per-project/per-checkout default,
 *      not committed upstream so each project clone can set its own)
 *   3. defaults to 8086
 * If the preferred port is busy, scans upward until a free one is found.
 *
 * Usage:
 *   yarn start                             -> uses metro-defaults.json, falls back to 8086
 *   node scripts/start-metro.js -p 8086    -> tries 8086, then 8087...
 *
 * Per-project default:
 *   Copy scripts/metro-defaults.example.json to scripts/metro-defaults.json
 *   and set "port" to whatever this project/checkout should default to.
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MAX_ATTEMPTS = 20;
const DEFAULT_PORT = 8086;
const PORT_FILE = path.join(__dirname, '.metro-port');
const DEFAULTS_FILE = path.join(__dirname, 'metro-defaults.json');

function readProjectDefaultPort() {
  try {
    const raw = JSON.parse(fs.readFileSync(DEFAULTS_FILE, 'utf8'));
    const port = parseInt(raw.port, 10);
    return Number.isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

function parsePreferredPort() {
  const args = process.argv.slice(2);
  const flagIdx = args.findIndex(a => a === '--port' || a === '-p');
  if (flagIdx !== -1 && args[flagIdx + 1]) {
    return parseInt(args[flagIdx + 1], 10);
  }
  const eqArg = args.find(a => a.startsWith('--port='));
  if (eqArg) {
    return parseInt(eqArg.split('=')[1], 10);
  }
  const envPort = process.env.RCT_METRO_PORT || process.env.PORT;
  if (envPort) {
    return parseInt(envPort, 10);
  }
  const projectDefault = readProjectDefaultPort();
  if (projectDefault) {
    return projectDefault;
  }
  return DEFAULT_PORT;
}

function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    // 0.0.0.0 so we detect any process bound on the port, matching Metro's bind.
    server.listen(port, '0.0.0.0');
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + MAX_ATTEMPTS; port++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) {
      return port;
    }
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
  }
  throw new Error(
    `No free port found in range ${start}-${start + MAX_ATTEMPTS - 1}`,
  );
}

(async () => {
  const preferred = parsePreferredPort();
  const port = await findFreePort(preferred);

  // Record the chosen port so companion scripts (e.g. android-dev-free) can read it.
  fs.writeFileSync(PORT_FILE, String(port));

  console.log(
    `\nStarting Metro on port ${port} (written to scripts/.metro-port)\n`,
  );

  // Strip our own --port/-p args so they aren't passed twice; we add the resolved one.
  const passThrough = process.argv.slice(2).filter((a, i, arr) => {
    if (a === '--port' || a === '-p') return false;
    if (arr[i - 1] === '--port' || arr[i - 1] === '-p') return false;
    if (a.startsWith('--port=')) return false;
    return true;
  });

  const child = spawn(
    'npx',
    ['react-native', 'start', '--port', String(port), ...passThrough],
    { stdio: 'inherit', shell: true },
  );

  child.on('exit', code => process.exit(code ?? 0));
})();
