const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ---------------------------------------------------------------------------
// Settings (remembered settings)
// Persisted as a small JSON file in Electron's userData folder:
//   { x, y, paused, bubblesHidden, startWithWindows }
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  x: null,
  y: null,
  paused: false,
  bubblesHidden: false,
  startWithWindows: false
};

let settings = { ...DEFAULT_SETTINGS };

function settingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    settings = { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  return settings;
}

let saveTimer = null;
function saveSettings() {
  // Debounced so window dragging doesn't hammer the disk.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSettingsNow();
  }, 300);
}

function saveSettingsNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    fs.mkdirSync(path.dirname(settingsFilePath()), { recursive: true });
    fs.writeFileSync(settingsFilePath(), JSON.stringify(settings, null, 2));
  } catch {
    // Settings are a nicety; never crash over them.
  }
}

// Union of every display's work area, in global screen coordinates.
// On a single monitor this is exactly that monitor's work area.
function allDisplaysBounds() {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const display of displays) {
    const area = display.workArea;
    minX = Math.min(minX, area.x);
    minY = Math.min(minY, area.y);
    maxX = Math.max(maxX, area.x + area.width);
    maxY = Math.max(maxY, area.y + area.height);
  }
  if (!isFinite(minX)) {
    const primary = screen.getPrimaryDisplay().workArea;
    return { width: primary.width, height: primary.height, offsetX: primary.x, offsetY: primary.y };
  }
  return { width: maxX - minX, height: maxY - minY, offsetX: minX, offsetY: minY };
}

// Keep a saved position reachable even if the monitor it was on is gone.
function clampToDisplays(x, y, winWidth, winHeight) {
  const bounds = allDisplaysBounds();
  const clampedX = Math.min(Math.max(x, bounds.offsetX), bounds.offsetX + bounds.width - winWidth);
  const clampedY = Math.min(Math.max(y, bounds.offsetY), bounds.offsetY + bounds.height - winHeight);
  return { x: clampedX, y: clampedY };
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  let startX = width - 250;
  let startY = height - 300;
  if (typeof settings.x === 'number' && typeof settings.y === 'number') {
    const clamped = clampToDisplays(settings.x, settings.y, 200, 250);
    startX = clamped.x;
    startY = clamped.y;
  }

  mainWindow = new BrowserWindow({
    width: 200,
    height: 250,
    x: startX,
    y: startY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.MIZUKI_SMOKE_TEST === '1') {
    installSmokeTestHooks(mainWindow);
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Remember where she was left.
  mainWindow.on('moved', () => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    settings.x = x;
    settings.y = y;
    saveSettings();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadSettings();
  // Persist defaults on first run so the settings file exists from the start.
  saveSettingsNow();
  // Keep the OS login-item state in step with the saved preference.
  try {
    app.setLoginItemSettings({ openAtLogin: !!settings.startWithWindows });
  } catch {
    // Unsupported platform (e.g. Linux) — the toggle is a no-op there.
  }
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  saveSettingsNow();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for window movement
ipcMain.on('move-window', (event, { deltaX, deltaY }) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + deltaX, y + deltaY);
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// Get screen bounds for walking animation — the union of ALL displays,
// so Mizuki can roam across monitors. Single-monitor setups get exactly
// the primary display's work area, as before.
ipcMain.handle('get-screen-bounds', () => {
  return allDisplaysBounds();
});

ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

ipcMain.on('set-window-position', (event, { x, y }) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

// ---------------------------------------------------------------------------
// Settings IPC
// ---------------------------------------------------------------------------
ipcMain.handle('get-settings', () => {
  return {
    paused: !!settings.paused,
    bubblesHidden: !!settings.bubblesHidden,
    startWithWindows: !!settings.startWithWindows
  };
});

ipcMain.on('update-settings', (event, partial) => {
  if (partial && typeof partial === 'object') {
    if (typeof partial.paused === 'boolean') settings.paused = partial.paused;
    if (typeof partial.bubblesHidden === 'boolean') settings.bubblesHidden = partial.bubblesHidden;
    saveSettings();
  }
});

// ---------------------------------------------------------------------------
// Click-through IPC (only her body catches clicks)
// The renderer decides, per mousemove, whether the pointer is over an
// interactive element (sprite / speech bubble / context menu) and tells us
// whether the window should ignore mouse events. { forward: true } keeps
// mousemove events flowing to the renderer while events are ignored, so she
// becomes clickable again when the pointer moves back over her.
// ---------------------------------------------------------------------------
ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(!!ignore, { forward: true });
  }
});

// ---------------------------------------------------------------------------
// Start-with-Windows IPC (Electron login item; Windows/macOS)
// ---------------------------------------------------------------------------
ipcMain.on('set-start-with-windows', (event, enabled) => {
  settings.startWithWindows = !!enabled;
  saveSettings();
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
  } catch {
    // Unsupported platform — the preference is still remembered.
  }
});

// ---------------------------------------------------------------------------
// Launch smoke test hooks (only active with MIZUKI_SMOKE_TEST=1, set by
// test/smoke-test.js via `npm test`). Samples the sprite's animation frame
// twice and reports a SMOKE_RESULT JSON line on stdout, then exits.
// ---------------------------------------------------------------------------
function installSmokeTestHooks(win) {
  const rendererErrors = [];
  win.webContents.on('console-message', (event, level, message) => {
    if (level >= 3) rendererErrors.push(String(message));
  });
  win.webContents.on('render-process-gone', (event, details) => {
    rendererErrors.push(`render-process-gone: ${details.reason}`);
  });

  const hardTimeout = setTimeout(() => {
    console.log('SMOKE_RESULT ' + JSON.stringify({ pass: false, fatal: 'timeout waiting for smoke check' }));
    app.exit(1);
  }, 20000);

  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const sample = () => win.webContents.executeJavaScript(`(() => {
          const s = document.getElementById('mizuki-sprite');
          if (!s) return { missing: true };
          return {
            pos: getComputedStyle(s).backgroundPosition,
            paused: s.classList.contains('paused'),
            apiType: typeof window.electronAPI
          };
        })()`);
        const first = await sample();
        await new Promise((resolve) => setTimeout(resolve, 1400));
        const second = await sample();
        const framesDiffer = first.pos !== second.pos;
        // If "paused" was restored from settings, still frames + the paused
        // class are the correct behaviour instead of advancing frames.
        const animationOk = framesDiffer || (!!settings.paused && first.paused && !framesDiffer);
        const pass =
          rendererErrors.length === 0 &&
          first.apiType === 'object' &&
          animationOk &&
          fs.existsSync(settingsFilePath());
        clearTimeout(hardTimeout);
        console.log('SMOKE_RESULT ' + JSON.stringify({
          pass,
          rendererErrors,
          first,
          second,
          framesDiffer,
          animationOk,
          settingsFileExists: fs.existsSync(settingsFilePath()),
          settingsPath: settingsFilePath(),
          windowPosition: win.getPosition(),
          settings: {
            paused: !!settings.paused,
            bubblesHidden: !!settings.bubblesHidden,
            startWithWindows: !!settings.startWithWindows
          }
        }));
        app.exit(pass ? 0 : 1);
      } catch (err) {
        clearTimeout(hardTimeout);
        console.log('SMOKE_RESULT ' + JSON.stringify({ pass: false, fatal: String(err) }));
        app.exit(1);
      }
    }, 800);
  });
}
