// Launch smoke test for Mizuki.
//
// Starts the real app headlessly (under Xvfb when there is no display),
// with ELECTRON_ENABLE_LOGGING=1 and MIZUKI_SMOKE_TEST=1. The main process
// then samples the sprite's animation frame twice and prints a SMOKE_RESULT
// JSON line. This test passes only if:
//   - the window loads with no renderer errors (no "Uncaught ..." output),
//   - window.electronAPI is available (the preload bridge works),
//   - the walk cycle advances between the two samples,
//   - the settings file was written.
// A fresh temporary user-data dir is used so saved settings (e.g. paused)
// from a real profile can never skew the result.
//
// Usage: npm test

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const TIMEOUT_MS = 60000;

// On a headless Linux box without a display, re-run ourselves under Xvfb.
if (!process.env.DISPLAY && process.platform === 'linux' && !process.env.MIZUKI_SMOKE_XVFB) {
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status === 0) {
    const child = spawn('xvfb-run', ['-a', process.execPath, __filename], {
      stdio: 'inherit',
      env: { ...process.env, MIZUKI_SMOKE_XVFB: '1' }
    });
    child.on('exit', (code) => process.exit(code == null ? 1 : code));
    return;
  }
  console.error('smoke-test: no DISPLAY and xvfb-run not found — cannot launch the app.');
  process.exit(1);
}

const electronPath = require('electron');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mizuki-smoke-'));

const child = spawn(
  electronPath,
  ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      MIZUKI_SMOKE_TEST: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });

const killer = setTimeout(() => {
  console.error('smoke-test: timed out waiting for the app to report.');
  child.kill('SIGKILL');
  process.exit(1);
}, TIMEOUT_MS);

child.on('exit', (code) => {
  clearTimeout(killer);
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }

  const resultLine = output.split('\n').find((line) => line.includes('SMOKE_RESULT '));
  const uncaught = output.match(/Uncaught [^\n]*/g) || [];

  let result = null;
  if (resultLine) {
    try {
      result = JSON.parse(resultLine.slice(resultLine.indexOf('SMOKE_RESULT ') + 'SMOKE_RESULT '.length));
    } catch { /* handled below */ }
  }

  if (!result) {
    console.error('smoke-test: FAIL — app never produced a SMOKE_RESULT line.');
    console.error(output.slice(-3000));
    process.exit(1);
  }
  if (uncaught.length > 0) {
    console.error('smoke-test: FAIL — renderer errors in output:', uncaught);
    process.exit(1);
  }
  if (code !== 0 || !result.pass) {
    console.error('smoke-test: FAIL —', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('smoke-test: PASS');
  console.log(`  renderer errors : ${result.rendererErrors.length}`);
  console.log(`  frame 1         : ${result.first.pos}`);
  console.log(`  frame 2         : ${result.second.pos} (advanced: ${result.framesDiffer})`);
  console.log(`  settings file   : ${result.settingsFileExists ? 'written' : 'MISSING'}`);
  process.exit(0);
});
