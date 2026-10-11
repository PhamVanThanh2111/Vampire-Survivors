/**
 * Main Entry Point: Input binding, canvas scaling, loop lifecycle
 */

import { Game } from './game.js';
import { soundManager } from './utils/sound.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  window.game = game;

  // Initialize AudioContext upon any user interaction
  const initAudio = () => {
    soundManager.ensureContext();
    window.removeEventListener('keydown', initAudio);
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  window.addEventListener('keydown', initAudio);
  window.addEventListener('click', initAudio);
  window.addEventListener('touchstart', initAudio);

  // Keyboard Event Listeners
  window.addEventListener('keydown', (e) => {
    // 1. Intercept keyboard input when Level Up Upgrade selection modal is active
    if (game.upgradeSystem && game.upgradeSystem.isSelecting) {
      const handled = game.upgradeSystem.handleKeyDown(e);
      if (handled) {
        e.preventDefault();
        return;
      }
    }

    const key = e.key.toLowerCase();

    // Movement
    if (key === 'w' || key === 'arrowup') game.input.up = true;
    if (key === 's' || key === 'arrowdown') game.input.down = true;
    if (key === 'a' || key === 'arrowleft') game.input.left = true;
    if (key === 'd' || key === 'arrowright') game.input.right = true;

    // Pause toggle
    if (key === 'p' || key === 'escape') {
      game.togglePause();
    }

    // Special Active Skills triggers (Key 1, 2, 3...)
    if (key === '1') game.activateSpecialSkill(1);
    if (key === '2') game.activateSpecialSkill(2);
    if (key === '3') game.activateSpecialSkill(3);
    if (key === '4') game.activateSpecialSkill(4);

    // Milestone Level 5 shortcut for instant testing
    if (key === '5') {
      game.player.level = 5;
      game.triggerLevelUp();
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    // Movement
    if (key === 'w' || key === 'arrowup') game.input.up = false;
    if (key === 's' || key === 'arrowdown') game.input.down = false;
    if (key === 'a' || key === 'arrowleft') game.input.left = false;
    if (key === 'd' || key === 'arrowright') game.input.right = false;
  });

  // Pause button UI
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      soundManager.playSelect();
      game.togglePause();
    });
  }

  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      soundManager.playSelect();
      game.togglePause();
    });
  }

  // Audio Mute UI
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = soundManager.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
      muteBtn.title = isMuted ? 'Bật âm thanh' : 'Tắt âm thanh';
    });
  }

  // Virtual Joypad / Touch support for mobile / touch devices
  const touchZone = document.getElementById('touch-controls');
  if (touchZone) {
    const handleTouch = (e) => {
      e.preventDefault();
      const rect = touchZone.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;

      const deadZone = 15;
      game.input.left = dx < -deadZone;
      game.input.right = dx > deadZone;
      game.input.up = dy < -deadZone;
      game.input.down = dy > deadZone;
    };

    const resetTouch = () => {
      game.input.up = false;
      game.input.down = false;
      game.input.left = false;
      game.input.right = false;
    };

    touchZone.addEventListener('touchstart', handleTouch, { passive: false });
    touchZone.addEventListener('touchmove', handleTouch, { passive: false });
    touchZone.addEventListener('touchend', resetTouch);
    touchZone.addEventListener('touchcancel', resetTouch);
  }

  // Game Loop with requestAnimationFrame
  function gameLoop(timestamp) {
    game.update(timestamp);
    game.render();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
