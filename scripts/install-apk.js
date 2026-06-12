/**
 * Installs the already-built debug APK on a chosen device and launches it,
 * pointed at the Metro port that start-metro.js chose. Does NOT build — use
 * this when android/app/build/outputs/apk/debug/app-debug.apk already exists.
 *
 * Reads scripts/.metro-port (written by start-metro.js). Sets up, scoped to
 * the target device:
 *   - adb reverse tcp:8085 tcp:<metroPort>  (app asks for 8085, host forwards)
 *   - adb install -r <debug apk>
 *   - adb shell am start -n <package>/.MainActivity
 *
 * Run `yarn start-free` (or start-auto) in another terminal first.
 *
 * Usage:
 *   node scripts/install-apk.js                 -> first device (prefers emulator)
 *   node scripts/install-apk.js --device <id>   -> that device
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PORT_FILE = path.join(__dirname, '.metro-port');
// Project root is one level up from scripts/, so paths work regardless of cwd.
const APK_DIR = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug');
const APP_ID = 'com.motocar';
// Port the app requests the bundle on; reverse-forwarded to the host Metro port.
const DEVICE_PORT = 8085;

// Builds with ABI splits (e.g. --active-arch-only) emit per-arch APKs like
// app-arm64-v8a-debug.apk rather than a single app-debug.apk. Pick the APK that
// matches the device's ABI, falling back to universal, then plain app-debug.apk.
function resolveApk(deviceId) {
  const abiRes = spawnSync(
    'adb',
    ['-s', deviceId, 'shell', 'getprop', 'ro.product.cpu.abi'],
    { encoding: 'utf8', shell: true },
  );
  const abi = (abiRes.stdout || '').trim();

  const candidates = [
    abi && `app-${abi}-debug.apk`,
    'app-universal-debug.apk',
    'app-debug.apk',
  ].filter(Boolean);

  for (const name of candidates) {
    const full = path.join(APK_DIR, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

// List connected, authorized devices as { id, isEmulator }.
function listDevices() {
  const res = spawnSync('adb', ['devices'], { encoding: 'utf8', shell: true });
  return (res.stdout || '')
    .split('\n')
    .slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(([id, state]) => id && state === 'device')
    .map(([id]) => ({ id, isEmulator: id.startsWith('emulator-') }));
}

// Pick the target device.
//   - explicit id via `--device <id>` / first CLI arg wins
//   - else prefer an emulator
//   - else the first available device
function pickDevice() {
  const args = process.argv.slice(2);
  const flagIdx = args.findIndex(a => a === '--device' || a === '-d');
  const explicit =
    flagIdx !== -1 ? args[flagIdx + 1] : args.find(a => !a.startsWith('-'));

  const devices = listDevices();
  if (devices.length === 0) return null;

  if (explicit) {
    const match = devices.find(d => d.id === explicit);
    if (match) return match.id;
    console.warn(`Device "${explicit}" not connected/authorized; falling back.`);
  }

  const emulator = devices.find(d => d.isEmulator);
  return (emulator || devices[0]).id;
}

function readMetroPort() {
  try {
    const raw = fs.readFileSync(PORT_FILE, 'utf8').trim();
    const port = parseInt(raw, 10);
    if (!Number.isNaN(port)) return port;
  } catch (_) {
    /* fall through */
  }
  return null;
}

function run(cmd, args, env) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  return res.status ?? 0;
}

const port = readMetroPort();

if (port === null) {
  console.error(
    '\nNo Metro port found (scripts/.metro-port missing).\n' +
      'Start Metro first in another terminal:  yarn start-free\n',
  );
  process.exit(1);
}

console.log(`\nUsing Metro on port ${port}\n`);

const device = pickDevice();
if (device) {
  console.log(`Targeting device: ${device}\n`);
} else {
  console.error('No authorized device connected. Run `adb devices` to check.\n');
  process.exit(1);
}

const apkPath = resolveApk(device);
if (!apkPath) {
  console.error(
    `\nNo matching debug APK found in ${APK_DIR}.\n` +
      'Build it first (e.g. yarn android-dev once, or a gradle assembleDebug).\n',
  );
  process.exit(1);
}
console.log(`Installing: ${path.basename(apkPath)}\n`);

// Scope every adb command to the chosen device so nothing leaks to the other phone.
const adbTarget = ['-s', device];

// App requests bundle on 8085 -> forward to the actual Metro port on the host.
run('adb', [...adbTarget, 'reverse', `tcp:${DEVICE_PORT}`, `tcp:${port}`]);

const installStatus = run('adb', [...adbTarget, 'install', '-r', apkPath]);
if (installStatus !== 0) {
  console.error('\nAPK install failed.\n');
  process.exit(installStatus);
}

const launchStatus = run('adb', [
  ...adbTarget,
  'shell',
  'am',
  'start',
  '-n',
  `${APP_ID}/.MainActivity`,
]);

process.exit(launchStatus);
