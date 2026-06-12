/**
 * Starts Metro on the first available port.
 *
 * Order of port selection:
 *   1. --port <n> / -p <n> CLI arg, or RCT_METRO_PORT / PORT env var (preferred port)
 *   2. defaults to 8085
 * If the preferred port is busy, scans upward until a free one is found.
 *
 * Usage:
 *   node scripts/start-metro.js            -> tries 8085, then 8086, 8087...
 *   node scripts/start-metro.js -p 8086    -> tries 8086, then 8087...
 *   yarn start-free                        -> tries 8086 first (see package.json)
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MAX_ATTEMPTS = 20;
const DEFAULT_PORT = 8085;
const PORT_FILE = path.join(__dirname, '.metro-port');

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
  throw new Error(`No free port found in range ${start}-${start + MAX_ATTEMPTS - 1}`);
}

(async () => {
  const preferred = parsePreferredPort();
  const port = await findFreePort(preferred);

  // Record the chosen port so companion scripts (e.g. android-dev-free) can read it.
  fs.writeFileSync(PORT_FILE, String(port));

  console.log(`\nStarting Metro on port ${port} (written to scripts/.metro-port)\n`);

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
