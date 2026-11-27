// Using the secure API exposed via preload script.
// NOTE: it must not be redeclared as `const { electronAPI } = window` —
// contextBridge installs the exposed name in the global lexical scope,
// so a top-level declaration of the same name throws
// "SyntaxError: Identifier 'electronAPI' has already been declared"
// and the whole renderer fails to run.
const api = window.electronAPI;

// DOM Elements
const sprite = document.getElementById('mizuki-sprite');
const speechBubble = document.getElementById('speech-bubble');
const speechText = document.getElementById('speech-text');

// Animation State
let currentFrame = 0;
let frameCount = 4; // 4 frames in sprite sheet
let animationInterval = null;
let walkInterval = null;
let speechTimeout = null;
let isDancing = false;
let isPaused = false;
let isBubbleHidden = false;

// Walking state
let walkDirection = 1; // 1 = right, -1 = left
let walkSpeed = 2; // pixels per step
let isWalking = true;

// Dragging state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let isPointerDown = false;

// Speech bubble messages
const messages = [
  "Konnichiwa! ♡",
  "Let's have fun today!",
  "I love spending time with you~",
  "Did you take a break?",
  "You're doing great!",
  "Remember to drink water!",
  "I'm always here for you!",
  "Keep up the good work!",
  "Want to see me dance?",
  "Click me for a surprise!",
  "You make me happy! ♡",
  "Let's be friends forever~",
  "Have you smiled today?",
  "You're amazing!",
  "Don't forget to rest~",
  "I practiced a new dance move!",
  "You look focused today!",
  "Tiny breaks make big brains!",
  "I believe in you!",
  "Let's make today count!",
  "Humming a little tune~ ♪",
  "Did you stretch your shoulders?",
  "One step at a time!",
  "I saved you a smile~",
  "Thinking of a new song...",
  "We make a great team!",
  "Your desktop feels like home~"
];

// A few lines that only show up at the right time of day
const timeOfDayMessages = {
  morning: [
    "Good morning! Ready for a great day?",
    "Morning! Did you sleep well?",
    "Rise and shine! ☀️"
  ],
  afternoon: [
    "Good afternoon! Keep it up!",
    "Afternoon stretch break?",
    "You're on a roll today!"
  ],
  evening: [
    "Good evening! Almost time to relax~",
    "Evening! You worked hard today.",
    "The stars will be out soon!"
  ],
  night: [
    "It's late... don't stay up too long~",
    "Night owl mode? Me too!",
    "Sleep is important, you know!"
  ]
};

let lastMessage = null;

// Pick a line she hasn't just said: general lines plus the ones that fit
// the current time of day, never repeating the previous line.
function pickMessage() {
  const hour = new Date().getHours();
  let bucket = timeOfDayMessages.night;
  if (hour >= 5 && hour < 12) bucket = timeOfDayMessages.morning;
  else if (hour >= 12 && hour < 18) bucket = timeOfDayMessages.afternoon;
  else if (hour >= 18 && hour < 23) bucket = timeOfDayMessages.evening;

  const pool = messages.concat(bucket).filter((line) => line !== lastMessage);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  lastMessage = pick;
  return pick;
}

// Whether she should launch with Windows (restored from settings)
let startWithWindows = false;

// Initialize animations
async function init() {
  // Restore remembered settings (paused / bubbles / start-with-Windows).
  // Position is restored by the main process when it creates the window.
  try {
    const saved = await api.getSettings();
    if (saved) {
      if (saved.paused) pause();
      if (saved.bubblesHidden) hideBubble();
      startWithWindows = !!saved.startWithWindows;
    }
  } catch {
    // No saved settings yet — defaults are fine.
  }

  startWalkAnimation();
  startWalking();
  scheduleSpeechBubble();
  setupEventListeners();
  setupClickThrough();
}

// Sprite animation (walk/dance frame cycling)
function startWalkAnimation() {
  if (animationInterval) clearInterval(animationInterval);
  
  animationInterval = setInterval(() => {
    if (!isPaused) {
      currentFrame = (currentFrame + 1) % frameCount;
      const xOffset = -currentFrame * 128;
      sprite.style.backgroundPosition = `${xOffset}px 0`;
    }
  }, 150); // 150ms per frame
}

// Walking movement across screen
async function startWalking() {
  if (walkInterval) clearInterval(walkInterval);
  
  const screenBounds = await api.getScreenBounds();
  
  // Bounds span every connected display (offsetX is 0 on a single monitor,
  // so single-screen walking behaves exactly as before).
  const minX = screenBounds.offsetX || 0;
  const maxX = minX + screenBounds.width - 200;

  walkInterval = setInterval(async () => {
    if (!isPaused && isWalking && !isDragging && !isDancing) {
      const pos = await api.getWindowPosition();
      let newX = pos.x + (walkDirection * walkSpeed);

      // Check boundaries and reverse direction if needed
      if (newX <= minX) {
        walkDirection = 1;
        sprite.classList.remove('flipped');
        newX = minX;
      } else if (newX >= maxX) {
        walkDirection = -1;
        sprite.classList.add('flipped');
        newX = maxX;
      }

      api.setWindowPosition(newX, pos.y);
    }
  }, 50); // Update position every 50ms
}

// Speech bubble logic
function showSpeechBubble() {
  if (isBubbleHidden) return;
  
  speechText.textContent = pickMessage();
  speechBubble.classList.remove('hidden');
  speechBubble.classList.add('visible');
  
  // Hide bubble after 5 seconds
  setTimeout(() => {
    speechBubble.classList.remove('visible');
    speechBubble.classList.add('hidden');
  }, 5000);
}

function scheduleSpeechBubble() {
  const randomDelay = (Math.random() * 60 + 30) * 1000; // 30-90 seconds
  
  speechTimeout = setTimeout(() => {
    showSpeechBubble();
    scheduleSpeechBubble(); // Schedule next bubble
  }, randomDelay);
}

// Dance animation
function startDancing() {
  isDancing = true;
  isWalking = false;
  sprite.classList.add('dancing');
  
  // Dance for 3 seconds
  setTimeout(() => {
    stopDancing();
  }, 3000);
}

function stopDancing() {
  isDancing = false;
  isWalking = true;
  sprite.classList.remove('dancing');
}

// Pause/Resume (remembered between launches)
function pause() {
  isPaused = true;
  sprite.classList.add('paused');
  api.updateSettings({ paused: true });
}

function resume() {
  isPaused = false;
  sprite.classList.remove('paused');
  api.updateSettings({ paused: false });
}

// Hide/Show bubble (remembered between launches)
function hideBubble() {
  isBubbleHidden = true;
  speechBubble.classList.remove('visible');
  speechBubble.classList.add('hidden');
  api.updateSettings({ bubblesHidden: true });
}

function showBubble() {
  isBubbleHidden = false;
  api.updateSettings({ bubblesHidden: false });
}

// Click-through: the window ignores mouse events everywhere except on her
// sprite, her speech bubble, and the context menu — so clicks on the
// transparent parts of the window land on whatever is behind her. The main
// process forwards mousemove events while ignoring, so moving the pointer
// back over her makes her clickable again.
let lastIgnoreState = null;
function setWindowIgnore(ignore) {
  if (ignore !== lastIgnoreState) {
    lastIgnoreState = ignore;
    api.setIgnoreMouseEvents(ignore);
  }
}

function setupClickThrough() {
  // Start click-through; the first mousemove over her body restores clicks.
  setWindowIgnore(true);

  document.addEventListener('mousemove', (e) => {
    // Never go click-through mid-drag — the drag would lose the pointer.
    if (isPointerDown) {
      setWindowIgnore(false);
      return;
    }
    const menu = document.getElementById('context-menu');
    const target = e.target;
    const overInteractive =
      target === sprite ||
      target === speechBubble ||
      speechBubble.contains(target) ||
      (menu && (target === menu || menu.contains(target)));
    setWindowIgnore(!overInteractive);
  });
}

// Event listeners
function setupEventListeners() {
  // Click to dance
  sprite.addEventListener('click', (e) => {
    if (!isDragging) {
      startDancing();
      showSpeechBubble();
    }
  });
  
  // Drag functionality
  sprite.addEventListener('mousedown', (e) => {
    isDragging = false;
    isPointerDown = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    
    const onMouseMove = (e) => {
      const deltaX = e.screenX - dragStartX;
      const deltaY = e.screenY - dragStartY;
      
      // Only start dragging if moved more than 5 pixels
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isDragging = true;
        api.moveWindow(deltaX, deltaY);
        dragStartX = e.screenX;
        dragStartY = e.screenY;
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      isPointerDown = false;

      // Reset dragging after a short delay to prevent click trigger
      setTimeout(() => {
        isDragging = false;
      }, 100);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  // Right-click context menu
  sprite.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });
}

// Custom context menu
function showContextMenu(x, y) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    font-family: 'Segoe UI', sans-serif;
    font-size: 12px;
    min-width: 120px;
  `;
  
  const menuItems = [
    { label: '💃 Dance', action: () => startDancing() },
    { label: isPaused ? '▶️ Resume' : '⏸️ Pause', action: () => isPaused ? resume() : pause() },
    { label: isBubbleHidden ? '💬 Show Bubble' : '🔇 Hide Bubble', action: () => isBubbleHidden ? showBubble() : hideBubble() },
    {
      label: `${startWithWindows ? '☑' : '☐'} Start with Windows`,
      action: () => {
        startWithWindows = !startWithWindows;
        api.setStartWithWindows(startWithWindows);
      }
    },
    { label: '❌ Quit', action: () => api.quitApp() }
  ];
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.textContent = item.label;
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#f0f0f0';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'white';
    });
    menuItem.addEventListener('click', () => {
      item.action();
      menu.remove();
    });
    menu.appendChild(menuItem);
  });
  
  document.body.appendChild(menu);

  // Close menu on click outside. With click-through enabled, clicks outside
  // the window never reach this document, so also close on window blur and
  // after a few seconds.
  const closeMenu = (e) => {
    if (!e || !menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      window.removeEventListener('blur', closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
  window.addEventListener('blur', closeMenu);
  setTimeout(() => closeMenu(null), 10000);
}

// Start everything
document.addEventListener('DOMContentLoaded', init);
