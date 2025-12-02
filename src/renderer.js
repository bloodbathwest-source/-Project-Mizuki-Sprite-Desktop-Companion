// Using the secure electronAPI exposed via preload script
const { electronAPI } = window;

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
  "Don't forget to rest~"
];

// Initialize animations
function init() {
  startWalkAnimation();
  startWalking();
  scheduleSpeechBubble();
  setupEventListeners();
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
  
  const screenBounds = await electronAPI.getScreenBounds();
  
  walkInterval = setInterval(async () => {
    if (!isPaused && isWalking && !isDragging && !isDancing) {
      const pos = await electronAPI.getWindowPosition();
      let newX = pos.x + (walkDirection * walkSpeed);
      
      // Check boundaries and reverse direction if needed
      if (newX <= 0) {
        walkDirection = 1;
        sprite.classList.remove('flipped');
        newX = 0;
      } else if (newX >= screenBounds.width - 200) {
        walkDirection = -1;
        sprite.classList.add('flipped');
        newX = screenBounds.width - 200;
      }
      
      electronAPI.setWindowPosition(newX, pos.y);
    }
  }, 50); // Update position every 50ms
}

// Speech bubble logic
function showSpeechBubble() {
  if (isBubbleHidden) return;
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  speechText.textContent = randomMessage;
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

// Pause/Resume
function pause() {
  isPaused = true;
  sprite.classList.add('paused');
}

function resume() {
  isPaused = false;
  sprite.classList.remove('paused');
}

// Hide/Show bubble
function hideBubble() {
  isBubbleHidden = true;
  speechBubble.classList.remove('visible');
  speechBubble.classList.add('hidden');
}

function showBubble() {
  isBubbleHidden = false;
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
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    
    const onMouseMove = (e) => {
      const deltaX = e.screenX - dragStartX;
      const deltaY = e.screenY - dragStartY;
      
      // Only start dragging if moved more than 5 pixels
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isDragging = true;
        electronAPI.moveWindow(deltaX, deltaY);
        dragStartX = e.screenX;
        dragStartY = e.screenY;
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
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
    { label: '❌ Quit', action: () => electronAPI.quitApp() }
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
  
  // Close menu on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}

// Start everything
document.addEventListener('DOMContentLoaded', init);
