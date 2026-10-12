/**
 * Game Core: State machine, entities lifecycle, camera, delta time, HUD
 */

import { Player } from './entities/player.js';
import { Bomb } from './entities/bomb.js';
import { DropItem } from './entities/item.js';
import { ParticleManager } from './utils/particle.js';
import { Spawner } from './systems/spawner.js';
import { CombatSystem } from './systems/combat.js';
import { UpgradeSystem } from './systems/upgrade.js';
import { soundManager } from './utils/sound.js?v=16';
import { SpatialGrid } from './utils/spatial_grid.js';

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

    // Arena Boundaries (Finite Map)
    this.mapWidth = 3200;
    this.mapHeight = 2400;

    // Spatial Hash Grid for high-performance O(N) queries
    this.spatialGrid = new SpatialGrid(90);

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

    // Entities (Spawn Player at Center of Arena)
    this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
    this.enemies = [];
    this.projectiles = [];
    this.bombs = [];
    this.gems = [];
    this.items = [];

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

    // Acquired Upgrades Tracking
    this.acquiredUpgrades = [];

    // Right-Edge Player Stats & Effects Panel Cache
    this.statsPanelEl = document.getElementById('player-stats-panel');
    this.statMaxHpEl = document.getElementById('stat-max-hp');
    this.statSpeedEl = document.getElementById('stat-speed');
    this.statDamageEl = document.getElementById('stat-damage');
    this.statCritChanceEl = document.getElementById('stat-crit-chance');
    this.statCritMultEl = document.getElementById('stat-crit-mult');
    this.statBladesEl = document.getElementById('stat-blades');
    this.statBladeSpeedEl = document.getElementById('stat-blade-speed');
    this.statCooldownEl = document.getElementById('stat-cooldown');
    this.statMagnetEl = document.getElementById('stat-magnet');
    this.statLifestealEl = document.getElementById('stat-lifesteal');
    this.playerEffectsListEl = document.getElementById('player-effects-list');
    this.lastEffectsKey = '';

    // Grid Floor Background Cache & Screen Vignette Cache
    this.gridSize = 64;
    this.floorPattern = null;
    this.initFloorPattern();
    this.vignetteGradient = null;
    this.initVignette();
    this._hudThrottle = 0;
  }

  initFloorPattern() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');

    pCtx.fillStyle = '#0f172a';
    pCtx.fillRect(0, 0, 64, 64);

    pCtx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
    pCtx.lineWidth = 1;
    pCtx.strokeRect(0.5, 0.5, 63, 63);

    pCtx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    pCtx.strokeRect(4.5, 4.5, 55, 55);

    pCtx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    pCtx.fillRect(30.5, 30.5, 3, 3);

    this.floorPattern = this.ctx.createPattern(pCanvas, 'repeat');
  }

  initVignette() {
    this.vignetteGradient = this.ctx.createRadialGradient(
      this.virtualWidth / 2,
      this.virtualHeight / 2,
      this.virtualWidth * 0.35,
      this.virtualWidth / 2,
      this.virtualHeight / 2,
      this.virtualWidth * 0.75
    );
    this.vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    this.vignetteGradient.addColorStop(1, 'rgba(3, 7, 18, 0.65)');
  }

  restart() {
    this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
    this.enemies = [];
    this.projectiles = [];
    this.bombs = [];
    this.gems = [];
    this.items = [];
    this.particles.clear();
    this.spawner.reset();
    this.acquiredUpgrades = [];
    this.lastEffectsKey = '';

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
    const bomb = new Bomb(x, y, 350, 135, this.player);
    this.bombs.push(bomb);
  }

  spawnDropItem(x, y, type = null) {
    const item = type ? new DropItem(x, y, type) : DropItem.createRandom(x, y);
    this.items.push(item);
    return item;
  }

  activateSpecialSkill(keyNumber) {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.player.triggerSpecialSkillByKey(keyNumber, this);
  }

  recordAcquiredUpgrade(card) {
    if (!card) return;
    const existing = this.acquiredUpgrades.find(u => u.id === card.id);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      this.acquiredUpgrades.push({
        id: card.id,
        title: card.title,
        icon: card.icon,
        type: card.type,
        isSpecial: !!card.isSpecial,
        description: card.description,
        count: 1
      });
    }
  }

  togglePause() {
    if (this.state === GAME_STATE.GAME_OVER) return;

    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      this.updatePauseUpgradesList();
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
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
    this.upgradeSystem.show(this.player, (chosenCard) => {
      this.recordAcquiredUpgrade(chosenCard);
      this.updatePlayerStatsHUD(true);
      this.state = GAME_STATE.PLAYING;
      this.lastTime = performance.now();
    }, this);
  }

  updatePauseUpgradesList() {
    const specialContainer = document.getElementById('pause-special-list');
    const normalContainer = document.getElementById('pause-normal-list');
    if (!specialContainer || !normalContainer) return;

    specialContainer.innerHTML = '';
    normalContainer.innerHTML = '';

    const specials = this.acquiredUpgrades.filter(u => u.isSpecial || u.type === 'SPECIAL');
    const normals = this.acquiredUpgrades.filter(u => !u.isSpecial && u.type !== 'SPECIAL');

    if (specials.length === 0) {
      specialContainer.innerHTML = '<div class="empty-upgrades-hint">Chưa có kỹ năng đặc biệt nào (Xuất hiện ngẫu nhiên tại các mốc cấp 5, 10...)</div>';
    } else {
      specials.forEach(u => {
        const item = document.createElement('div');
        item.className = 'pause-card-item special';
        item.innerHTML = `
          <div class="pause-card-header">
            <span class="pause-card-badge special">ĐẶC BIỆT</span>
            ${u.count > 1 ? `<span class="pause-card-count">CẤP ${u.count}</span>` : ''}
          </div>
          <div class="pause-card-main">
            <span class="pause-card-icon">${u.icon}</span>
            <div class="pause-card-details">
              <h4 class="pause-card-title">${u.title}</h4>
              <p class="pause-card-desc">${u.description}</p>
            </div>
          </div>
        `;
        specialContainer.appendChild(item);
      });
    }

    if (normals.length === 0) {
      normalContainer.innerHTML = '<div class="empty-upgrades-hint">Chưa chọn thẻ cường hóa nào. Hãy thu thập Gem để lên cấp!</div>';
    } else {
      normals.forEach(u => {
        const item = document.createElement('div');
        const badgeClass = (u.type || 'weapon').toLowerCase();
        item.className = `pause-card-item ${badgeClass}`;
        item.innerHTML = `
          <div class="pause-card-header">
            <span class="pause-card-badge ${badgeClass}">${u.type || 'NÂNG CẤP'}</span>
            ${u.count > 1 ? `<span class="pause-card-count">x${u.count}</span>` : ''}
          </div>
          <div class="pause-card-main">
            <span class="pause-card-icon">${u.icon}</span>
            <div class="pause-card-details">
              <h4 class="pause-card-title">${u.title}</h4>
              <p class="pause-card-desc">${u.description}</p>
            </div>
          </div>
        `;
        normalContainer.appendChild(item);
      });
    }
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

      // 1. Update Player & clamp within arena boundaries
      this.player.update(dt, this.input);
      this.player.x = Math.max(this.player.radius, Math.min(this.mapWidth - this.player.radius, this.player.x));
      this.player.y = Math.max(this.player.radius, Math.min(this.mapHeight - this.player.radius, this.player.y));

      // 2. Camera follows player, clamped to arena bounds so viewport stays within arena
      this.camera.x = Math.max(0, Math.min(this.mapWidth - this.virtualWidth, this.player.x - this.virtualWidth / 2));
      this.camera.y = Math.max(0, Math.min(this.mapHeight - this.virtualHeight, this.player.y - this.virtualHeight / 2));

      // 3. Spawner update (passing arena bounds)
      const bounds = { width: this.mapWidth, height: this.mapHeight };
      this.spawner.update(dt, this.player, this.enemies, bounds);

      // 3.5 Build Spatial Hash Grid for all active enemies
      this.spatialGrid.populate(this.enemies);

      // 4. Update Enemies with Spatial Grid & Arena bounds
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(dt, this.player, this.spatialGrid, bounds);
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

      // 6. Update Gems & Drop Items
      for (let i = 0; i < this.gems.length; i++) {
        this.gems[i].update(dt, this.player);
      }
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].update(dt, this.player);
      }

      // 7. Combat System (Collisions, attacks, exp pickup, item drops using SpatialGrid)
      this.combat.update(
        dt,
        this.player,
        this.enemies,
        this.projectiles,
        this.gems,
        this.items,
        () => this.triggerLevelUp(),
        () => this.triggerGameOver(),
        this,
        this.spatialGrid
      );

      // 8. Update Particles & Floating Text
      this.particles.update(dt);

      // 9. Update HUD
      this.updateHUD();
    }
  }

  updateHUD() {
    // Keep HP bar and Exp bar animations fluid at 60 FPS
    if (this.hudHpBar) {
      const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      this.hudHpBar.style.width = `${hpPct}%`;
    }
    if (this.hudExpBar) {
      const expPct = Math.min(100, (this.player.exp / this.player.expToNextLevel) * 100);
      this.hudExpBar.style.width = `${expPct}%`;
    }

    // Throttle DOM text updates to ~15 FPS to eliminate Layout Thrashing
    this._hudThrottle = (this._hudThrottle || 0) + 1;
    if (this._hudThrottle % 4 === 0) {
      if (this.hudHpText) {
        this.hudHpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
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

      // Update Right-Edge Vertical Player Stats & Effects Panel
      this.updatePlayerStatsHUD();
    }
  }

  renderPlayerStats(force = false) {
    this.updatePlayerStatsHUD(force);
    this.updateHUD();
  }

  updatePlayerStatsHUD(force = false) {
    if (!this.player) return;

    // 1. Update Numeric Stats
    if (this.statMaxHpEl) {
      this.statMaxHpEl.textContent = `${this.player.maxHp} HP`;
    }
    if (this.statSpeedEl) {
      this.statSpeedEl.textContent = `${Math.round(this.player.speed)} px/s`;
    }
    if (this.statDamageEl) {
      this.statDamageEl.textContent = `x${this.player.damageMultiplier.toFixed(2)}`;
    }
    if (this.statCritChanceEl) {
      const critPct = Math.round(this.player.critChance * 100);
      this.statCritChanceEl.textContent = critPct >= 100 ? '100% (MAX)' : `${critPct}%`;
      if (critPct >= 100) {
        this.statCritChanceEl.style.color = '#f59e0b';
      } else {
        this.statCritChanceEl.style.color = '';
      }
    }
    if (this.statCritMultEl) {
      this.statCritMultEl.textContent = `x${this.player.critMultiplier.toFixed(2)}`;
    }
    if (this.statBladesEl) {
      this.statBladesEl.textContent = `${this.player.bladeCount}/6 quả`;
      if (this.player.bladeCount >= 6) {
        this.statBladesEl.style.color = '#38bdf8';
      } else {
        this.statBladesEl.style.color = '';
      }
    }
    if (this.statBladeSpeedEl) {
      this.statBladeSpeedEl.textContent = `${this.player.bladeSpeed.toFixed(1)} rad/s`;
    }
    if (this.statCooldownEl) {
      this.statCooldownEl.textContent = `${this.player.boltCooldown.toFixed(2)}s`;
    }
    if (this.statMagnetEl) {
      this.statMagnetEl.textContent = `${Math.round(this.player.magnetRadius)} px`;
    }
    if (this.statLifestealEl) {
      const lifestealPct = Math.round((this.player.lifesteal || 0) * 100);
      this.statLifestealEl.textContent = `${lifestealPct}%`;
      if (lifestealPct > 0) {
        this.statLifestealEl.style.color = '#f43f5e';
      } else {
        this.statLifestealEl.style.color = '';
      }
    }

    // 2. Update Status Effects List with interactive hover tooltips
    if (!this.playerEffectsListEl) return;

    const hasBomb = this.player.hasSpecialSkill && this.player.hasSpecialSkill('special_bomb');
    const hasAllStats = this.player.hasSpecialSkill && this.player.hasSpecialSkill('special_all_stats');
    const freezePct = Math.round(this.player.freezeChance * 100);
    const bleedPct = Math.round(this.player.bleedChance * 100);
    const stunPct = Math.round(this.player.stunChance * 100);
    const lifestealPct = Math.round((this.player.lifesteal || 0) * 100);

    const effectsKey = `${freezePct}_${bleedPct}_${this.player.bleedDamage}_${stunPct}_${lifestealPct}_${hasBomb}_${hasAllStats}`;
    if (!force && this.lastEffectsKey === effectsKey) {
      return; // No change in effects, avoid rebuilding DOM so hover state is rock-solid!
    }
    this.lastEffectsKey = effectsKey;

    let itemsHtml = '';
    let count = 0;

    // Lifesteal Effect
    if (this.player.lifesteal > 0) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item lifesteal" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">🩸</span>
            <span class="effect-badge-name">Hút Máu</span>
            <span class="effect-badge-rate">+${lifestealPct}%</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header lifesteal">
              <span class="tooltip-icon">🩸</span>
              <span class="tooltip-title">HÚT MÁU (LIFESTEAL)</span>
            </div>
            <p class="tooltip-desc">Đòn đánh trúng kẻ địch sẽ chuyển hóa <strong>${lifestealPct}% lượng sát thương gây ra</strong> thành sinh lực hồi phục trực tiếp cho nhân vật.</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Tỉ lệ hồi máu:</span><strong>+${lifestealPct}% sát thương</strong></div>
              <div class="tooltip-stat-row"><span>Áp dụng cho:</span><strong>Magic Bolt & Orbiting Shield</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // Freeze / Slow Effect
    if (this.player.freezeChance > 0) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item freeze" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">❄️</span>
            <span class="effect-badge-name">Băng Hàn</span>
            <span class="effect-badge-rate">${freezePct}%</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header freeze">
              <span class="tooltip-icon">❄️</span>
              <span class="tooltip-title">BĂNG HÀN (LÀM CHẬM)</span>
            </div>
            <p class="tooltip-desc">Đòn đánh phủ sương giá lên kẻ địch, làm chậm <strong>35% tốc độ di chuyển</strong> trong 2.5 giây. Quái bị làm chậm phát vệt sương trắng đằng sau lưng khi di chuyển.</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Tỉ lệ kích hoạt:</span><strong>${freezePct}%</strong></div>
              <div class="tooltip-stat-row"><span>Làm chậm tốc độ:</span><strong>-35%</strong></div>
              <div class="tooltip-stat-row"><span>Thời gian hiệu lực:</span><strong>2.5s</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // Bleed DoT Effect
    if (this.player.bleedChance > 0) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item bleed" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">🩸</span>
            <span class="effect-badge-name">Xuất Huyết</span>
            <span class="effect-badge-rate">${bleedPct}%</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header bleed">
              <span class="tooltip-icon">🩸</span>
              <span class="tooltip-title">HUYẾT TRẬN (RÚT MÁU)</span>
            </div>
            <p class="tooltip-desc">Đòn đánh gây vết thương hở sâu sắc, liên tục cấu rỉa máu kẻ địch theo thời gian (Damage over Time) trong 3.0 giây.</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Tỉ lệ kích hoạt:</span><strong>${bleedPct}%</strong></div>
              <div class="tooltip-stat-row"><span>Sát thương mỗi giây:</span><strong>${this.player.bleedDamage} DMG</strong></div>
              <div class="tooltip-stat-row"><span>Thời gian rút máu:</span><strong>3.0s</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // Stun Effect
    if (this.player.stunChance > 0) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item stun" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">💫</span>
            <span class="effect-badge-name">Choáng Váng</span>
            <span class="effect-badge-rate">${stunPct}%</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header stun">
              <span class="tooltip-icon">💫</span>
              <span class="tooltip-title">CHOÁNG VÁNG (BẤT ĐỘNG)</span>
            </div>
            <p class="tooltip-desc">Cơ hội đánh choáng khiến quái vật <strong>chôn chân bất động hoàn toàn</strong>, không thể di chuyển hay cắn người chơi trong 1.0 giây.</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Tỉ lệ kích hoạt:</span><strong>${stunPct}%</strong></div>
              <div class="tooltip-stat-row"><span>Thời gian choáng:</span><strong>1.0s</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // Mega Bomb Special Skill
    if (hasBomb) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item bomb" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">💣</span>
            <span class="effect-badge-name">Bom Hủy Diệt</span>
            <span class="effect-badge-rate">[Phím 1]</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header bomb">
              <span class="tooltip-icon">💣</span>
              <span class="tooltip-title">BOM HỦY DIỆT (CHỦ ĐỘNG)</span>
            </div>
            <p class="tooltip-desc">Bấm phím <strong>[1]</strong> để thả quả bom tại vị trí đứng và di chuyển thoát thân. Bom nổ sau đúng 1.0s gây sát thương diện rộng cực lớn!</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Sát thương nổ:</span><strong>350 AOE DMG</strong></div>
              <div class="tooltip-stat-row"><span>Bán kính nổ:</span><strong>210 px</strong></div>
              <div class="tooltip-stat-row"><span>Thời gian nổ:</span><strong>1.0s sau khi đặt</strong></div>
              <div class="tooltip-stat-row"><span>Hồi chiêu:</span><strong>35s</strong></div>
              <div class="tooltip-stat-row" style="color: #ef4444;"><span>⚠️ Cảnh báo tự nổ:</span><strong>-35 HP nếu đứng gần</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // All Stats Up Special Passive
    if (hasAllStats) {
      count++;
      itemsHtml += `
        <div class="effect-badge-item all-stats" tabindex="0">
          <div class="effect-badge-header">
            <span class="effect-badge-icon">👑</span>
            <span class="effect-badge-name">Thần Quang</span>
            <span class="effect-badge-rate">Nội Tại</span>
          </div>
          <div class="effect-tooltip">
            <div class="tooltip-header all-stats">
              <span class="tooltip-icon">👑</span>
              <span class="tooltip-title">THẦN QUANG TOÀN NĂNG</span>
            </div>
            <p class="tooltip-desc">Nội tại đặc biệt tăng cường toàn diện mọi thuộc tính: Máu tối đa, Tốc độ chạy, Sát thương, Tỉ lệ chí mạng và củng cố toàn bộ các hiệu ứng khống chế.</p>
            <div class="tooltip-stats">
              <div class="tooltip-stat-row"><span>Loại kỹ năng:</span><strong>Nội tại đặc biệt</strong></div>
              <div class="tooltip-stat-row"><span>Phạm vi:</span><strong>Tăng toàn bộ chỉ số</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    if (count === 0) {
      itemsHtml = `<div class="no-effects-hint">Chưa có hiệu ứng<br><small style="color: #64748b;">(Chọn thẻ khi thăng cấp)</small></div>`;
    }

    this.playerEffectsListEl.innerHTML = itemsHtml;
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

    // 1. Draw Bounded Arena Floor Grid & Boundary Walls
    this.drawFloorGrid(ctx);

    // Viewport Frustum Culling bounds (Camera viewport + small margin)
    const cullPad = 65;
    const viewMinX = this.camera.x - cullPad;
    const viewMaxX = this.camera.x + this.virtualWidth + cullPad;
    const viewMinY = this.camera.y - cullPad;
    const viewMaxY = this.camera.y + this.virtualHeight + cullPad;

    // 2. Draw Gems & Drop Items (Culled to camera viewport)
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (g.x >= viewMinX && g.x <= viewMaxX && g.y >= viewMinY && g.y <= viewMaxY) {
        g.draw(ctx);
      }
    }
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.x >= viewMinX && it.x <= viewMaxX && it.y >= viewMinY && it.y <= viewMaxY) {
        it.draw(ctx);
      }
    }

    // 3. Draw Enemies (Culled to camera viewport)
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.x >= viewMinX && e.x <= viewMaxX && e.y >= viewMinY && e.y <= viewMaxY) {
        e.draw(ctx);
      }
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

    // 7. Draw Vignette in screen space (reusing cached gradient)
    this.drawScreenOverlay(ctx);

    // 8. Draw Real-time Minimap in Bottom-Right Corner
    this.drawMinimap(ctx);
  }

  drawFloorGrid(ctx) {
    // 1. Draw finite arena floor with pre-cached pattern in 1 single call!
    if (this.floorPattern) {
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
    }

    // 2. Draw stylish glowing arena boundary barrier
    ctx.save();
    // Glowing red hazard boundary border
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.strokeRect(0, 0, this.mapWidth, this.mapHeight);

    // Inner cyan laser line
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.strokeRect(3, 3, this.mapWidth - 6, this.mapHeight - 6);

    // Corner beacon pillars
    const corners = [
      [0, 0],
      [this.mapWidth, 0],
      [this.mapWidth, this.mapHeight],
      [0, this.mapHeight]
    ];
    for (let i = 0; i < corners.length; i++) {
      const [cx, cy] = corners[i];
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawScreenOverlay(ctx) {
    if (this.vignetteGradient) {
      ctx.fillStyle = this.vignetteGradient;
      ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
    }
  }

  /**
   * Renders real-time Minimap in Bottom-Right Corner
   */
  drawMinimap(ctx) {
    const mmW = 180;
    const mmH = 135; // 4:3 matching 3200x2400
    const mmX = this.virtualWidth - mmW - 18;
    const mmY = this.virtualHeight - mmH - 18;

    ctx.save();

    // 1. Outer Container Frame (Glassmorphic dark slate panel)
    ctx.fillStyle = 'rgba(11, 15, 25, 0.88)';
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmW, mmH, 8);
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.stroke();

    // Inner clip so blips don't spill out
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mmX + 1, mmY + 1, mmW - 2, mmH - 2, 7);
    ctx.clip();

    // Subtle coordinate grid crosshair
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmX + mmW / 2, mmY);
    ctx.lineTo(mmX + mmW / 2, mmY + mmH);
    ctx.moveTo(mmX, mmY + mmH / 2);
    ctx.lineTo(mmX + mmW, mmY + mmH / 2);
    ctx.stroke();

    // Coordinate transformation scales
    const scaleX = mmW / this.mapWidth;
    const scaleY = mmH / this.mapHeight;

    // 2. Camera Viewport Box on Minimap
    const camMmX = mmX + this.camera.x * scaleX;
    const camMmY = mmY + this.camera.y * scaleY;
    const camMmW = this.virtualWidth * scaleX;
    const camMmH = this.virtualHeight * scaleY;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(camMmX, camMmY, camMmW, camMmH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camMmX, camMmY, camMmW, camMmH);

    // 3. Drop Items on Minimap (small emerald blips)
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.isCollected) continue;
      const ix = mmX + it.x * scaleX;
      const iy = mmY + it.y * scaleY;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(ix, iy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Enemies on Minimap (red dots, amber for brutes)
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.isDead) continue;
      const ex = mmX + e.x * scaleX;
      const ey = mmY + e.y * scaleY;

      if (e.type === 'brute') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      }
    }

    // 5. Player on Minimap (bright cyan blip with pulsing radar wave)
    const px = mmX + this.player.x * scaleX;
    const py = mmY + this.player.y * scaleY;

    const radarPulse = 4 + Math.sin(this.survivalTimer * 5) * 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, radarPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Undo inner clip

    // 6. Header Badge with Real-time Monster Count
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(mmX + 6, mmY + 6, 88, 18, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`👾 QUÁI: ${this.enemies.length}`, mmX + 11, mmY + 15);

    ctx.restore();
  }
}
