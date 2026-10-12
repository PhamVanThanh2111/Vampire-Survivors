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

    // Acquired Upgrades Tracking
    this.acquiredUpgrades = [];

    // Right-Edge Player Stats & Effects Panel Cache
    this.statsPanelEl = document.getElementById('player-stats-panel');
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
    const bomb = new Bomb(x, y, 350, 240, this.player);
    this.bombs.push(bomb);
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

    // Update Right-Edge Vertical Player Stats & Effects Panel
    this.updatePlayerStatsHUD();
  }

  updatePlayerStatsHUD(force = false) {
    if (!this.player) return;

    // 1. Update Numeric Stats
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
