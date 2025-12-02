# Mizuki Sprite Desktop Companion

A playful Electron desktop app where Mizuki (your anime AI persona) walks around the screen, dances when clicked, and shows random speech bubbles with short messages. It uses a transparent, frameless window that floats above your desktop.

## Features

- 🎭 **Transparent, always-on-top window** - Mizuki floats above your desktop
- 🚶 **Walk animation** - Mizuki walks back and forth across your screen using sprite sheet animation
- 💃 **Dance animation** - Click Mizuki to make her dance!
- 💬 **Random speech bubbles** - Mizuki says random messages every 30-90 seconds
- 🖱️ **Drag functionality** - Drag Mizuki anywhere on your screen
- 📋 **Right-click context menu**:
  - Dance - Make Mizuki dance
  - Pause/Resume - Pause or resume animations
  - Hide/Show bubble - Toggle speech bubbles
  - Quit - Close the application

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

## Usage

- **Click** on Mizuki to make her dance and show a speech bubble
- **Drag** Mizuki anywhere on your screen by clicking and dragging
- **Right-click** on Mizuki to access the context menu with options:
  - Dance, Pause/Resume, Hide/Show bubble, Quit

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
│   ├── main.js        # Electron main process
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Styling
│   └── renderer.js    # Renderer process (animations, interactions)
├── assets/
│   ├── mizuki-walk.png   # Walk animation sprite sheet
│   └── mizuki-dance.png  # Dance animation sprite sheet
├── package.json
└── README.md
```

## Technologies

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps with JavaScript
- HTML5 Canvas for sprite animation
- CSS3 for styling and transitions

## License

MIT License - See [LICENSE](LICENSE) for details.
