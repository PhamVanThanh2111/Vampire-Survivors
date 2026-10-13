/**
 * Main Entry Point: Input binding, canvas scaling, loop lifecycle
 */

import { Game } from './game.js';
import { soundManager } from './utils/sound.js';
import { UPGRADE_POOL } from './systems/upgrade.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  window.game = game;
  window.UPGRADE_POOL = UPGRADE_POOL;

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

    // Normal Level Up shortcut for instant testing (Roll 3 thẻ thường)
    if (key === '6' || key === 'u') {
      game.player.level = game.player.level === 4 ? 6 : game.player.level + 1;
      if (game.player.level % 5 === 0) game.player.level++;
      game.triggerLevelUp();
    }

    // Instant Lifesteal shortcut for testing (Phím L)
    if (key === 'l') {
      const card = UPGRADE_POOL.find(c => c.id === 'lifesteal_effect');
      if (card && (!card.isAvailable || card.isAvailable(game.player))) {
        card.apply(game.player, game);
        game.recordAcquiredUpgrade(card);
        game.renderPlayerStats(true);
        soundManager.playSelect();
        if (game.particles) {
          game.particles.addFloatingText(game.player.x, game.player.y - 25, '+1% Hút Máu (Lifesteal)!', '#f43f5e', true);
          game.particles.spark(game.player.x, game.player.y, '#f43f5e', 8);
        }
      }
    }

    // Instant Max HP boost shortcut for testing (Phím H)
    if (key === 'h') {
      const card = UPGRADE_POOL.find(c => c.id === 'max_hp_boost');
      if (card && (!card.isAvailable || card.isAvailable(game.player))) {
        card.apply(game.player, game);
        game.recordAcquiredUpgrade(card);
        game.renderPlayerStats(true);
        soundManager.playSelect();
        if (game.particles) {
          game.particles.addFloatingText(game.player.x, game.player.y - 25, `+40 Máu tối đa! (${Math.ceil(game.player.hp)}/${game.player.maxHp})`, '#10b981', true);
          game.particles.spark(game.player.x, game.player.y, '#10b981', 8);
        }
      }
    }

    // Spawn Drop Item showcase shortcut for testing (Phím I)
    if (key === 'i') {
      const types = ['health', 'max_hp', 'damage', 'speed', 'vacuum', 'freeze'];
      types.forEach((type, idx) => {
        const offsetX = (idx - 2.5) * 48;
        const offsetY = -140; // Ngoài tầm hút 100px để người chơi quan sát rõ ràng
        game.spawnDropItem(game.player.x + offsetX, game.player.y + offsetY, type);
      });
      soundManager.playShoot();
      if (game.particles) {
        game.particles.addFloatingText(game.player.x, game.player.y - 40, '✨ Đã rơi 6 loại vật phẩm!', '#facc15', true);
      }
    }

    // Summon Boss "Hoả diệm vương" shortcut for testing (Phím B)
    if (key === 'b') {
      game.spawnBoss('fire_lord');
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
    try {
      game.update(timestamp);
      game.render();
    } catch (err) {
      console.error('Game loop error:', err);
    }
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
