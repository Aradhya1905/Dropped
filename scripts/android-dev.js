/**
 * Launches the Android dev build pointed at the Metro port that start-metro.js chose.
 *
 * Reads scripts/.metro-port (written by start-metro.js). Sets up:
 *   - adb reverse tcp:8085 tcp:<metroPort>  (device still asks for 8085, host forwards)
 *   - react-native run-android --active-arch-only --port <metroPort>
 *
 * Run `yarn start-free` (or start-auto) in another terminal first.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PORT_FILE = path.join(__dirname, '.metro-port');
// Port the device requests the bundle on; reverse-forwarded to the host Metro port.
const DEVICE_PORT = 8085;

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
    console.warn(
      `Device "${explicit}" not connected/authorized; falling back.`,
    );
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

// Device requests bundle on 8085 -> forward to the actual Metro port on the host.
const device = pickDevice();
if (device) {
  console.log(`Targeting device: ${device}\n`);
} else {
  console.error(
    'No authorized device connected. Run `adb devices` to check.\n',
  );
  process.exit(1);
}

// Scope adb reverse to the chosen device so the bundle is forwarded there only.
const adbTarget = ['-s', device];
run('adb', [...adbTarget, 'reverse', `tcp:${DEVICE_PORT}`, `tcp:${port}`]);

const runArgs = [
  'react-native',
  'run-android',
  '--active-arch-only',
  // Metro is already running (yarn start-free) on this port. Without
  // --no-packager, run-android tries to launch its own packager on --port,
  // collides with the running one, and prompts to bump the port (breaking the
  // adb reverse forwarding set up above). The app fetches the bundle on the
  // device's 8085, which is reverse-forwarded to the host Metro port.
  '--no-packager',
  '--port',
  String(port),
];
runArgs.push('--device', device);

// ANDROID_SERIAL scopes the Gradle installDebug task to this one device — without
// it, Gradle installs the APK on every connected device. --device only affects
// which device RN launches on, not which Gradle installs to.
const status = run('npx', runArgs, { ANDROID_SERIAL: device });

process.exit(status);
