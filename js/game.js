/**
 * Game Core: State machine, entities lifecycle, camera, delta time, HUD
 */

import { Player } from './entities/player.js';
import { Bomb } from './entities/bomb.js';
import { ParticleManager } from './utils/particle.js';
import { Spawner } from './systems/spawner.js';
import { CombatSystem } from './systems/combat.js';
import { UpgradeSystem } from './systems/upgrade.js';
import { soundManager } from './utils/sound.js';

export const GAME_STATE = {
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Virtual Internal Resolution
    this.virtualWidth = 1280;
    this.virtualHeight = 720;
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;

    // State Machine
    this.state = GAME_STATE.PLAYING;
    this.lastTime = performance.now();
    this.survivalTimer = 0;
    this.killCount = 0;

    // Camera
    this.camera = { x: 0, y: 0 };

    // Systems
    this.particles = new ParticleManager();
    this.spawner = new Spawner(this.virtualWidth, this.virtualHeight);
    this.combat = new CombatSystem(this.particles);
    this.upgradeSystem = new UpgradeSystem();

    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Entities
    this.player = new Player(0, 0);
    this.enemies = [];
    this.projectiles = [];
    this.bombs = [];
    this.gems = [];

    // HUD Elements Cache
    this.hudHpBar = document.getElementById('hp-bar-fill');
    this.hudHpText = document.getElementById('hp-text');
    this.hudExpBar = document.getElementById('exp-bar-fill');
    this.hudLevelText = document.getElementById('level-badge');
    this.hudTimerText = document.getElementById('timer-display');
    this.hudKillsText = document.getElementById('kills-display');
    this.specialTrayEl = document.getElementById('special-skills-tray');

    // Game Over Elements
    this.gameOverModal = document.getElementById('game-over-modal');
    this.finalTimeEl = document.getElementById('final-time');
    this.finalKillsEl = document.getElementById('final-kills');
    this.finalLevelEl = document.getElementById('final-level');
    this.restartBtn = document.getElementById('restart-btn');

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        soundManager.playSelect();
        this.restart();
      });
    }

    // Grid Floor Background Cache / Seed
    this.gridSize = 64;
  }

  restart() {
    this.player = new Player(0, 0);
    this.enemies = [];
    this.projectiles = [];
    this.bombs = [];
    this.gems = [];
    this.particles.clear();
    this.spawner.reset();

    this.survivalTimer = 0;
    this.killCount = 0;
    this.lastTime = performance.now();

    if (this.gameOverModal) {
      this.gameOverModal.classList.remove('visible');
      this.gameOverModal.classList.add('hidden');
    }

    this.state = GAME_STATE.PLAYING;
  }

  spawnBomb(x, y) {
    const bomb = new Bomb(x, y, 350, 240, this.player);
    this.bombs.push(bomb);
  }

  activateSpecialSkill(keyNumber) {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.player.triggerSpecialSkillByKey(keyNumber, this);
  }

  togglePause() {
    if (this.state === GAME_STATE.GAME_OVER) return;

    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      document.getElementById('pause-modal')?.classList.remove('hidden');
      document.getElementById('pause-modal')?.classList.add('visible');
    } else if (this.state === GAME_STATE.PAUSED) {
      // Don't unpause if level up modal is active
      if (!this.upgradeSystem.modalEl.classList.contains('visible')) {
        this.state = GAME_STATE.PLAYING;
        this.lastTime = performance.now();
        document.getElementById('pause-modal')?.classList.remove('visible');
        document.getElementById('pause-modal')?.classList.add('hidden');
      }
    }
  }

  triggerLevelUp() {
    this.state = GAME_STATE.PAUSED;
    this.upgradeSystem.show(this.player, (chosenCard) => {
      this.state = GAME_STATE.PLAYING;
      this.lastTime = performance.now();
    }, this);
  }

  triggerGameOver() {
    this.state = GAME_STATE.GAME_OVER;

    if (this.finalTimeEl) this.finalTimeEl.textContent = this.formatTime(this.survivalTimer);
    if (this.finalKillsEl) this.finalKillsEl.textContent = `${this.killCount}`;
    if (this.finalLevelEl) this.finalLevelEl.textContent = `Lv.${this.player.level}`;

    if (this.gameOverModal) {
      this.gameOverModal.classList.remove('hidden');
      this.gameOverModal.classList.add('visible');
    }
  }

  update(currentTime) {
    // Delta time calculation in seconds
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Guard against large lag spikes when switching tabs
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;

    if (this.state === GAME_STATE.PLAYING) {
      this.survivalTimer += dt;

      // 1. Update Player
      this.player.update(dt, this.input);

      // 2. Camera follows player smoothly
      this.camera.x = this.player.x - this.virtualWidth / 2;
      this.camera.y = this.player.y - this.virtualHeight / 2;

      // 3. Spawner update
      this.spawner.update(dt, this.player, this.enemies);

      // 4. Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(dt, this.player, this.enemies);
        if (enemy.isDead) {
          this.enemies.splice(i, 1);
          this.killCount++;
        }
      }

      // 5. Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        proj.update(dt);
        if (proj.isDead) {
          this.projectiles.splice(i, 1);
        }
      }

      // 5.5 Update Mega Bombs
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const bomb = this.bombs[i];
        bomb.update(dt, this);
        if (bomb.isDead) {
          this.bombs.splice(i, 1);
        }
      }

      // 6. Update Gems
      for (let i = 0; i < this.gems.length; i++) {
        this.gems[i].update(dt, this.player);
      }

      // 7. Combat System (Collisions, attacks, exp pickup)
      this.combat.update(
        dt,
        this.player,
        this.enemies,
        this.projectiles,
        this.gems,
        () => this.triggerLevelUp(),
        () => this.triggerGameOver()
      );

      // 8. Update Particles & Floating Text
      this.particles.update(dt);

      // 9. Update HUD
      this.updateHUD();
    }
  }

  updateHUD() {
    if (this.hudHpBar) {
      const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      this.hudHpBar.style.width = `${hpPct}%`;
    }
    if (this.hudHpText) {
      this.hudHpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
    }
    if (this.hudExpBar) {
      const expPct = Math.min(100, (this.player.exp / this.player.expToNextLevel) * 100);
      this.hudExpBar.style.width = `${expPct}%`;
    }
    if (this.hudLevelText) {
      this.hudLevelText.textContent = `LV ${this.player.level}`;
    }
    if (this.hudTimerText) {
      this.hudTimerText.textContent = this.formatTime(this.survivalTimer);
    }
    if (this.hudKillsText) {
      this.hudKillsText.textContent = `💀 ${this.killCount}`;
    }

    // Update Bottom-Left Special Skills Tray
    this.updateSpecialSkillsHUD();
  }

  updateSpecialSkillsHUD() {
    if (!this.specialTrayEl) {
      this.specialTrayEl = document.getElementById('special-skills-tray');
    }
    if (!this.specialTrayEl) return;

    const skills = this.player.specialSkills || [];
    if (skills.length === 0) {
      this.specialTrayEl.style.display = 'none';
      return;
    }
    this.specialTrayEl.style.display = 'flex';

    // Synchronize DOM elements with skills count
    if (this.specialTrayEl.children.length !== skills.length) {
      this.specialTrayEl.innerHTML = '';
      skills.forEach((skill) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'special-skill-slot';
        slotEl.id = `special-skill-${skill.id}`;
        slotEl.title = `${skill.title}${skill.isActive ? ` (Phím ${skill.key})` : ' (Kỹ năng nội tại)'}`;

        const keyBadgeHtml = skill.isActive
          ? `<span class="skill-key-badge">${skill.key}</span>`
          : `<span class="skill-passive-badge">★</span>`;

        slotEl.innerHTML = `
          ${keyBadgeHtml}
          <div class="skill-icon">${skill.icon}</div>
          <div class="skill-cooldown-overlay"></div>
          <span class="skill-cooldown-text"></span>
        `;

        if (skill.isActive) {
          slotEl.addEventListener('click', () => {
            this.activateSpecialSkill(skill.key);
          });
        }

        this.specialTrayEl.appendChild(slotEl);
      });
    }

    // Update real-time cooldown and ready states
    skills.forEach((skill, index) => {
      const slotEl = this.specialTrayEl.children[index];
      if (!slotEl) return;

      if (skill.isActive) {
        const overlay = slotEl.querySelector('.skill-cooldown-overlay');
        const text = slotEl.querySelector('.skill-cooldown-text');
        const isOnCooldown = skill.cooldownTimer > 0;

        if (isOnCooldown) {
          slotEl.classList.add('on-cooldown');
          slotEl.classList.remove('ready');
          const pct = Math.min(100, (skill.cooldownTimer / skill.cooldown) * 100);
          if (overlay) overlay.style.height = `${pct}%`;
          if (text) {
            text.style.display = 'block';
            text.textContent = skill.cooldownTimer < 10
              ? skill.cooldownTimer.toFixed(1) + 's'
              : Math.ceil(skill.cooldownTimer) + 's';
          }
        } else {
          slotEl.classList.remove('on-cooldown');
          slotEl.classList.add('ready');
          if (overlay) overlay.style.height = '0%';
          if (text) text.style.display = 'none';
        }
      } else {
        slotEl.classList.add('passive-slot');
      }
    });
  }

  formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  render() {
    const ctx = this.ctx;

    // Clear Canvas
    ctx.fillStyle = '#0b0f19'; // Deep gothic dark void
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Camera Transform with Screen Shake
    ctx.save();
    let shakeX = 0;
    let shakeY = 0;
    if (this.combat.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.combat.screenShake * 2;
      shakeY = (Math.random() - 0.5) * this.combat.screenShake * 2;
    }

    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    // 1. Draw Infinite Tiled Floor Grid
    this.drawFloorGrid(ctx);

    // 2. Draw Gems
    for (let i = 0; i < this.gems.length; i++) {
      this.gems[i].draw(ctx);
    }

    // 3. Draw Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].draw(ctx);
    }

    // 3.5 Draw Mega Bombs on ground
    for (let i = 0; i < this.bombs.length; i++) {
      this.bombs[i].draw(ctx);
    }

    // 4. Draw Projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].draw(ctx);
    }

    // 5. Draw Player
    this.player.draw(ctx);

    // 6. Draw Particles & Damage Text (rendered in world coordinates)
    this.particles.draw(ctx);

    ctx.restore();

    // 7. Draw Vignette & Ambience in screen space
    this.drawScreenOverlay(ctx);
  }

  drawFloorGrid(ctx) {
    const startX = Math.floor(this.camera.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(this.camera.y / this.gridSize) * this.gridSize;
    const endX = startX + this.virtualWidth + this.gridSize * 2;
    const endY = startY + this.virtualHeight + this.gridSize * 2;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';

    ctx.beginPath();
    for (let x = startX; x <= endX; x += this.gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += this.gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Subtle grid intersection dots
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    for (let x = startX; x <= endX; x += this.gridSize * 2) {
      for (let y = startY; y <= endY; y += this.gridSize * 2) {
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
  }

  drawScreenOverlay(ctx) {
    // Subtle dark gothic vignette around edges
    const grad = ctx.createRadialGradient(
      this.virtualWidth / 2,
      this.virtualHeight / 2,
      this.virtualWidth * 0.35,
      this.virtualWidth / 2,
      this.virtualHeight / 2,
      this.virtualWidth * 0.75
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0.65)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
  }
}
