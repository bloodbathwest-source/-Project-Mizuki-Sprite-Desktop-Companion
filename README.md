# Mizuki Sprite Desktop Companion

A playful Electron desktop app where Mizuki (your anime AI persona) walks around the screen, dances when clicked, and shows random speech bubbles with short messages. It uses a transparent, frameless window that floats above your desktop.

## Features

- 🎭 **Transparent, always-on-top window** - Mizuki floats above your desktop
- 🚶 **Walk animation** - Mizuki walks back and forth across your screen using sprite sheet animation
- 💃 **Dance animation** - Click Mizuki to make her dance!
- 💬 **Random speech bubbles** - Mizuki says random messages every 30-90 seconds, from a pool of ~30 lines (including a few that only appear at the right time of day), and never repeats the line she just said
- 🖱️ **Drag functionality** - Drag Mizuki anywhere on your screen
- 👆 **Click-through** - Clicks on the transparent parts of her window pass through to what's behind her; only her body (and her bubble/menu) catches clicks
- 💾 **Remembered settings** - Her position, paused state, and bubble on/off choice are saved to a small settings file and restored on the next launch
- 🖥️ **Multi-monitor roaming** - With more than one screen, she can walk across all of them
- 🚀 **Start with Windows** - Optional right-click toggle so she launches with your computer
- 📋 **Right-click context menu**:
  - Dance - Make Mizuki dance
  - Pause/Resume - Pause or resume animations
  - Hide/Show bubble - Toggle speech bubbles
  - Start with Windows - Toggle launching with the computer
  - Quit - Close the application

## Running without a terminal (Windows)

Double-click **`RUN-MIZUKI.bat`** in this folder. On the first run it installs
what she needs (`npm install`), then starts her (`npm start`). The only
requirement is [Node.js](https://nodejs.org) — the launcher will tell you if
it's missing.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/bloodbathwest-source/-Project-Mizuki-Sprite-Desktop-Companion.git
   cd -Project-Mizuki-Sprite-Desktop-Companion
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

4. Run the launch smoke test (starts the app headlessly and checks she renders and walks):
   ```bash
   npm test
   ```

## Packaging a Windows installer

The electron-builder configuration is ready in `package.json`. To produce the
installer and a portable `.exe`:

```bash
npm install
npm run dist
```

The results land in `dist/` (an NSIS installer and a portable exe).
**Note:** actually producing the `.exe` has to be done on a Windows machine
(or a Windows CI runner) — this repo ships the ready-to-use build
configuration plus the `RUN-MIZUKI.bat` launcher above, which is the way to
run her without a terminal today.

## Usage

- **Click** on Mizuki to make her dance and show a speech bubble
- **Drag** Mizuki anywhere on your screen by clicking and dragging
- **Right-click** on Mizuki to access the context menu with options:
  - Dance, Pause/Resume, Hide/Show bubble, Start with Windows, Quit

## Customization

### Custom Sprite Sheets

You can replace the sprite sheets in the `assets/` folder:
- `mizuki-walk.png` - Walk animation sprite sheet (512x128, 4 frames of 128x128)
- `mizuki-dance.png` - Dance animation sprite sheet (512x128, 4 frames of 128x128)

### Custom Messages

Edit the `messages` array in `src/renderer.js` to customize what Mizuki says.

## Project Structure

```
├── src/
│   ├── main.js        # Electron main process (window, settings, IPC)
│   ├── preload.js     # Preload script for secure IPC
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Styling
│   └── renderer.js    # Renderer process (animations, interactions)
├── assets/
│   ├── mizuki-walk.png   # Walk animation sprite sheet
│   └── mizuki-dance.png  # Dance animation sprite sheet
├── test/
│   └── smoke-test.js  # Launch smoke test (npm test)
├── RUN-MIZUKI.bat     # Double-click launcher for Windows
├── package.json
└── README.md
```

## Technologies

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps with JavaScript
- HTML5 Canvas for sprite animation
- CSS3 for styling and transitions

## License

MIT License - See [LICENSE](LICENSE) for details.
