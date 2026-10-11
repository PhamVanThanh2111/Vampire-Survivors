/**
 * Upgrade System: Card definitions, random generation, stat application,
 * and Milestone Level 5 Tilted 3D Circular Orbit Card Carousel Roll.
 */

import { soundManager } from '../utils/sound.js';

export const UPGRADE_POOL = [
  {
    id: 'speed_boost',
    title: '+20% Tốc độ di chuyển',
    icon: '⚡',
    type: 'PASSIVE',
    description: 'Tăng tốc độ di chuyển giúp né quái dễ dàng hơn.',
    apply(player) {
      player.speed = Math.round(player.speed * 1.2);
    }
  },
  {
    id: 'damage_boost',
    title: '+25% Sát thương vũ khí',
    icon: '⚔️',
    type: 'WEAPON',
    description: 'Gia tăng sức mạnh cho cả Magic Bolt và Orbiting Shield.',
    apply(player) {
      player.damageMultiplier += 0.25;
      player.updateBlades();
    }
  },
  {
    id: 'extra_blade',
    title: '+1 Quả cầu xoay Orbiting Shield',
    icon: '🛡️',
    type: 'WEAPON',
    description: 'Thêm một quả cầu bảo hộ xoay xung quanh (tối đa 6 quả).',
    isAvailable(player) {
      return player.bladeCount < 6;
    },
    apply(player) {
      if (player.bladeCount < 6) {
        player.bladeCount += 1;
        player.updateBlades();
      }
    }
  },
  {
    id: 'blade_speed_boost',
    title: '+35% Tốc độ xoay Orbiting Shield',
    icon: '🌀',
    type: 'WEAPON',
    description: 'Quả cầu bảo hộ xoay nhanh hơn đáng kể, càn quét kẻ địch liên tục.',
    isAvailable(player) {
      return player.bladeSpeed < 8.5;
    },
    apply(player) {
      player.bladeSpeed = parseFloat((player.bladeSpeed * 1.35).toFixed(2));
    }
  },
  {
    id: 'heal_hp',
    title: 'Hồi 40 Máu',
    icon: '💖',
    type: 'SURVIVAL',
    description: 'Phục hồi ngay lập tức 40 HP sinh lực.',
    apply(player) {
      player.heal(40);
    }
  },
  {
    id: 'magnet_boost',
    title: '+50% Bán kính hút Gem (Magnet)',
    icon: '🧲',
    type: 'PASSIVE',
    description: 'Hút các viên EXP Gem từ khoảng cách xa hơn.',
    apply(player) {
      player.magnetRadius = Math.round(player.magnetRadius * 1.5);
    }
  },
  {
    id: 'cooldown_reduct',
    title: '-20% Cooldown bắn đạn',
    icon: '🔮',
    type: 'WEAPON',
    description: 'Magic Bolt bắn nhanh hơn đáng kể.',
    isAvailable(player) {
      return player.boltCooldown > 0.16;
    },
    apply(player) {
      player.boltCooldown = Math.max(0.15, parseFloat((player.boltCooldown * 0.8).toFixed(3)));
    }
  },
  {
    id: 'crit_chance_boost',
    title: '+15% Tỉ lệ chí mạng',
    icon: '🎯',
    type: 'OFFENSE',
    description: 'Gia tăng cơ hội tung đòn chí mạng bộc phát lượng sát thương cực đại.',
    isAvailable(player) {
      return player.critChance < 1.0;
    },
    apply(player) {
      player.critChance = Math.min(1.0, parseFloat((player.critChance + 0.15).toFixed(2)));
    }
  },
  {
    id: 'crit_damage_boost',
    title: '+50% Sát thương chí mạng',
    icon: '💥',
    type: 'OFFENSE',
    description: 'Các đòn đánh chí mạng hủy diệt kẻ địch với lượng sát thương nhân bội.',
    apply(player) {
      player.critMultiplier = parseFloat((player.critMultiplier + 0.50).toFixed(2));
    }
  },
  {
    id: 'bleed_effect',
    title: 'Huyết Trận (Xuất huyết DoT)',
    icon: '🩸',
    type: 'STATUS',
    description: 'Đòn đánh gây xuất huyết, liên tục cấu rỉa máu kẻ địch trong 3 giây.',
    isAvailable(player) {
      return player.bleedChance < 1.0;
    },
    apply(player) {
      player.bleedChance = Math.min(1.0, parseFloat((player.bleedChance + 0.35).toFixed(2)));
      player.bleedDamage = Math.round(player.bleedDamage * 1.35 + 4);
    }
  },
  {
    id: 'freeze_effect',
    title: 'Băng Hàn (Làm chậm 35%)',
    icon: '❄️',
    type: 'STATUS',
    description: 'Đòn đánh đóng băng phủ sương giá, làm chậm 35% tốc độ di chuyển của địch.',
    isAvailable(player) {
      return player.freezeChance < 1.0;
    },
    apply(player) {
      player.freezeChance = Math.min(1.0, parseFloat((player.freezeChance + 0.35).toFixed(2)));
      player.freezeSlowFactor = Math.min(0.40, parseFloat((player.freezeSlowFactor + 0.05).toFixed(2)));
    }
  },
  {
    id: 'stun_effect',
    title: '+8% Tỉ lệ choáng địch',
    icon: '💫',
    type: 'STATUS',
    description: 'Cơ hội đánh choáng khiến kẻ địch đứng chôn chân bất động trong 1.0 giây.',
    isAvailable(player) {
      return player.stunChance < 0.28;
    },
    apply(player) {
      player.stunChance = Math.min(0.28, parseFloat((player.stunChance + 0.08).toFixed(2)));
      player.stunDuration = 1.0;
    }
  },
  // SPECIAL CATEGORY CARDS (Chỉ có tỉ lệ xuất hiện tại các mốc Cấp 5, 10, 15...)
  {
    id: 'special_all_stats',
    title: '🌟 Thần Quang Toàn Năng (All Stats Up)',
    icon: '👑',
    type: 'SPECIAL',
    isSpecial: true,
    description: 'Thẻ Đặc Biệt: +20 Máu tối đa, +12% Tốc độ, +15% Sát thương, +6% Chí mạng & tăng cường mọi hiệu ứng!',
    isAvailable(player) {
      return player.level % 5 === 0;
    },
    apply(player) {
      player.maxHp += 20;
      player.heal(40);
      player.speed = Math.round(player.speed * 1.12);
      player.damageMultiplier = parseFloat((player.damageMultiplier + 0.15).toFixed(2));
      player.critChance = Math.min(1.0, parseFloat((player.critChance + 0.06).toFixed(2)));
      player.critMultiplier += 0.25;
      player.magnetRadius = Math.round(player.magnetRadius * 1.2);
      player.boltCooldown = Math.max(0.15, player.boltCooldown * 0.92);
      player.bleedDamage += 3;
      if (player.bladeCount < 6) {
        player.bladeCount += 1;
      }
      player.bladeSpeed = parseFloat((player.bladeSpeed * 1.15).toFixed(2));
      player.updateBlades();

      // Register into special skills tray
      if (!player.hasSpecialSkill('special_all_stats')) {
        player.addSpecialSkill({
          id: 'special_all_stats',
          title: 'Thần Quang',
          icon: '👑',
          type: 'SPECIAL',
          isActive: false
        });
      }
    }
  },
  {
    id: 'special_bomb',
    title: '💣 Bom Hủy Diệt (Mega Bomb)',
    icon: '💣',
    type: 'SPECIAL',
    isSpecial: true,
    description: 'Thẻ Đặc Biệt: Đặt 1 quả bom tại vị trí đang đứng, nổ sau 1 giây gây sát thương cực mạnh xung quanh (có thể gây sát thương lên chính nhân vật!). Hồi chiêu 35s (Bấm phím số để kích hoạt).',
    isAvailable(player) {
      return player.level % 5 === 0 && !player.hasSpecialSkill('special_bomb');
    },
    apply(player, game) {
      player.addSpecialSkill({
        id: 'special_bomb',
        title: 'Bom Hủy Diệt',
        icon: '💣',
        type: 'SPECIAL',
        isActive: true,
        cooldown: 35.0,
        cooldownTimer: 0.0,
        onActivate: (gameInstance, p) => {
          soundManager.playBombPlant();
          if (gameInstance && gameInstance.spawnBomb) {
            gameInstance.spawnBomb(p.x, p.y);
          }
        }
      });
    }
  }
];

export class UpgradeSystem {
  constructor() {
    this.modalEl = document.getElementById('level-up-modal');
    this.titleEl = document.getElementById('modal-title');
    this.subtitleEl = document.getElementById('modal-subtitle');
    this.rouletteSectionEl = document.getElementById('roulette-section');
    this.orbitCanvas = document.getElementById('orbit-canvas');
    this.cardsContainerEl = document.getElementById('cards-container');

    this.orbitCtx = this.orbitCanvas ? this.orbitCanvas.getContext('2d') : null;
    this.orbitAngle = 0;
    this.orbitVelocity = 0;
    this.orbitAnimId = null;
    this.onSelectCallback = null;

    // Keyboard & Mouse selection state
    this.currentCards = [];
    this.selectedIndex = 0;
    this.isSelecting = false;
    this.player = null;
    this.lastMouseX = -1;
    this.lastMouseY = -1;

    // Direct capture-phase keydown listener on window to guarantee 100% responsiveness
    this.boundKeyHandler = (e) => {
      if (this.isSelecting) {
        const handled = this.handleKeyDown(e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', this.boundKeyHandler, true);
  }

  /**
   * Generates 3 unique upgrades from the pool.
   * Thẻ SPECIAL chỉ có tỉ lệ xuất hiện (45%) tại các mốc Cấp 5, 10, 15... (không chắc chắn 100%).
   */
  getRandomUpgrades(player, count = 3) {
    const isMilestone = player.level % 5 === 0;

    // Filter normal (non-special) cards that are currently available
    let normalPool = UPGRADE_POOL.filter(
      up => !up.isSpecial && (!up.isAvailable || up.isAvailable(player))
    );

    // Fallback if available cards are fewer than count (when many cards reach max cap)
    if (normalPool.length < count) {
      const repeatables = UPGRADE_POOL.filter(up =>
        ['damage_boost', 'heal_hp', 'speed_boost', 'crit_damage_boost'].includes(up.id)
      );
      const poolIds = new Set(normalPool.map(u => u.id));
      for (const rep of repeatables) {
        if (!poolIds.has(rep.id)) {
          normalPool.push(rep);
          poolIds.add(rep.id);
        }
      }
    }

    // Filter available special cards
    const specialPool = UPGRADE_POOL.filter(
      up => up.isSpecial && (!up.isAvailable || up.isAvailable(player))
    );

    let chosenCards = [];

    // Tỉ lệ xuất hiện thẻ ĐẶC BIỆT tại mỗi mốc cấp 5: 45% (Không chắc chắn 100%)
    const specialRollChance = 0.45;
    const shouldIncludeSpecial = isMilestone && specialPool.length > 0 && Math.random() < specialRollChance;

    if (shouldIncludeSpecial) {
      // Pick 1 Special card
      const randomSpecial = specialPool[Math.floor(Math.random() * specialPool.length)];
      chosenCards.push(randomSpecial);

      // Pick the remaining 2 cards from the normal pool
      const shuffledNormal = [...normalPool].sort(() => 0.5 - Math.random());
      chosenCards.push(...shuffledNormal.slice(0, count - 1));
    } else {
      // Pick all 3 cards from normal pool
      const shuffledNormal = [...normalPool].sort(() => 0.5 - Math.random());
      chosenCards = shuffledNormal.slice(0, Math.min(count, shuffledNormal.length));
    }

    // Shuffle final 3 cards so Special card isn't always in slot 1
    return chosenCards.sort(() => 0.5 - Math.random());
  }

  /**
   * Opens the level up modal with 3 cards (or 3D circular orbit carousel roll on milestone levels)
   */
  show(player, onSelect, game = null) {
    this.game = game;
    this.onSelectCallback = onSelect;
    const isMilestone = player.level % 5 === 0;
    const targetCards = this.getRandomUpgrades(player, 3);

    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('visible');

    if (isMilestone && this.rouletteSectionEl && this.orbitCanvas) {
      // Milestone Level (5, 10, 15...): Run the 3D Tilted Circular Orbit Carousel!
      this.rouletteSectionEl.classList.remove('hidden');
      if (this.titleEl) this.titleEl.textContent = `🎰 VÒNG QUAY MAY MẮN (CẤP ${player.level})!`;
      if (this.subtitleEl) this.subtitleEl.textContent = `🎰 Đang quay vòng roll 3 thẻ vào 3 khung bên dưới...`;

      // 1. Render the 3 empty card frames in cards-container FIRST under the 3 lights
      this.renderEmptySlots();

      // 2. Start the 3D Tilted Orbit Roll animation
      this.spinOrbit(targetCards, player, () => {
        soundManager.playWheelWin();
        if (this.subtitleEl) {
          this.subtitleEl.textContent = '✨ Đã khóa 3 thẻ thành công! Hãy chọn 1 thẻ cường hóa bên dưới:';
        }
        // 3. Fill the 3 empty frames with the exact 3 cards selected from the pool
        this.fillSlotsWithCards(targetCards, player);
      });
    } else {
      // Normal Level Up: Show the 3 cards directly
      if (this.rouletteSectionEl) this.rouletteSectionEl.classList.add('hidden');
      if (this.titleEl) this.titleEl.textContent = `THĂNG CẤP! (LV ${player.level})`;
      if (this.subtitleEl) this.subtitleEl.textContent = 'Hãy chọn 1 thẻ cường hóa để tăng sức mạnh sinh tồn';
      this.renderCards(targetCards, player);
    }
  }

  /**
   * Displays the 3 empty placeholder frames waiting for cards to settle in under the 3 lights
   */
  renderEmptySlots() {
    this.cardsContainerEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'card-slot-frame empty';
      slotEl.id = `slot-frame-${i}`;
      slotEl.innerHTML = `
        <div class="card-spotlight-beam"></div>
        <div class="slot-badge">KHUNG CHỌN ${i + 1}</div>
        <div class="slot-scanner"></div>
        <div class="slot-placeholder">
          <span class="slot-icon">🎲</span>
          <span class="slot-text">Đang quay thẻ...</span>
        </div>
        <div class="slot-badge" style="opacity: 0.65;">CHỜ KHÓA THẺ</div>
      `;
      this.cardsContainerEl.appendChild(slotEl);
    }
  }

  /**
   * Fills the 3 frames with the 3 cards won from the pool, locking them into the frames
   */
  fillSlotsWithCards(cards, player) {
    this.cardsContainerEl.innerHTML = '';
    this.currentCards = cards;
    this.selectedIndex = 0;
    this.isSelecting = true;
    this.player = player;

    cards.forEach((card, index) => {
      const slotEl = document.createElement('div');
      const isSpecial = card.type === 'SPECIAL';
      slotEl.className = `card-slot-frame filled ${isSpecial ? 'special' : ''}`;
      slotEl.id = `slot-frame-${index}`;
      slotEl.style.animationDelay = `${index * 0.12}s`;

      slotEl.innerHTML = `
        <div class="card-spotlight-beam"></div>
        <div class="card-badge ${card.type.toLowerCase()}">${card.type}</div>
        <div class="card-icon">${card.icon}</div>
        <h3 class="card-title">${card.title}</h3>
        <p class="card-desc">${card.description}</p>
      `;

      slotEl.addEventListener('mouseenter', () => {
        this.focusCardByIndex(index);
      });

      slotEl.addEventListener('mousemove', (e) => {
        if (this.lastMouseX !== e.clientX || this.lastMouseY !== e.clientY) {
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          if (this.selectedIndex !== index) {
            this.focusCardByIndex(index);
          }
        }
      });

      slotEl.addEventListener('click', () => {
        this.selectCardByIndex(index);
      });

      this.cardsContainerEl.appendChild(slotEl);
    });

    this.updateFocusedCard();
  }

  /**
   * 3D Tilted Circular Orbit Carousel Roll Animation
   */
  spinOrbit(targetCards, player, onComplete) {
    if (!this.orbitCtx) {
      if (onComplete) onComplete();
      return;
    }

    const poolCards = UPGRADE_POOL.filter(up => !up.isAvailable || up.isAvailable(player));
    this.orbitVelocity = 24.0 + Math.random() * 5.0; // Initial rotation speed
    let lastTickAngle = 0;
    let lastTimestamp = performance.now();

    const animateOrbit = (now) => {
      const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      this.orbitAngle += this.orbitVelocity * dt;
      this.orbitVelocity *= Math.pow(0.965, dt * 60); // Friction deceleration

      // Play tick audio on segment intervals
      const step = (Math.PI * 2) / poolCards.length;
      if (Math.abs(this.orbitAngle - lastTickAngle) >= step) {
        lastTickAngle = this.orbitAngle;
        soundManager.playWheelTick();
      }

      const isSpinning = this.orbitVelocity > 0.45;
      this.drawOrbitView(poolCards, isSpinning, targetCards);

      if (isSpinning) {
        this.orbitAnimId = requestAnimationFrame(animateOrbit);
      } else {
        this.orbitVelocity = 0;
        // Spin finished: Draw strictly and exclusively the 3 target cards above the 3 lights!
        this.drawOrbitView(poolCards, false, targetCards);
        if (onComplete) onComplete();
      }
    };

    if (this.orbitAnimId) cancelAnimationFrame(this.orbitAnimId);
    this.orbitAnimId = requestAnimationFrame(animateOrbit);
  }

  /**
   * Draws the 3D Tilted Circular Orbit.
   * When isSpinning is TRUE: draws pool cards rotating around the ellipse track.
   * When isSpinning is FALSE (kết quả quay ra):
   * STRICTLY AND EXCLUSIVELY draws ONLY the 3 result cards (targetCards) in the wheel,
   * with 3 bright spotlights shining STRAIGHT DOWN directly into the 3 result cards below!
   */
  drawOrbitView(cards, isSpinning = true, targetCards = null) {
    if (!this.orbitCtx) return;
    const ctx = this.orbitCtx;
    const w = this.orbitCanvas.width;   // 760
    const h = this.orbitCanvas.height;  // 160
    const cx = w / 2;                   // 380
    const cy = 46;

    // Elliptical radii for top-down tilted diagonal orbit path
    const rx = 285;
    const ry = 26;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw glowing elliptical floor orbit path
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright dotted track
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 12, ry - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Exact X positions of the 3 result cards below (centers of 230px frames in 760px container)
    const slotXPositions = [130, 380, 630];
    const cardYPositions = [56, 72, 56];

    // 2. DRAW THE 3 SPOTLIGHT BEAMS (Chiếu thẳng đứng xuống 3 thẻ kết quả)
    ctx.save();
    for (let s = 0; s < slotXPositions.length; s++) {
      const sx = slotXPositions[s];
      const startY = cardYPositions[s];
      const isCardSpecial = !isSpinning && targetCards && targetCards[s] && targetCards[s].type === 'SPECIAL';

      // Width of beam: starts at card base (60px), expands straight down to card slot width (210px)
      const topHalfW = 30;
      const bottomHalfW = 105;

      // Volumetric spotlight trapezoid
      const grad = ctx.createLinearGradient(sx, startY, sx, h);
      if (isSpinning) {
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.7)');
      } else if (isCardSpecial) {
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.75)');
        grad.addColorStop(0.7, 'rgba(168, 85, 247, 0.45)');
        grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.95)');
      } else {
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
        grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.6)');
        grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.85)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - topHalfW, startY);
      ctx.lineTo(sx + topHalfW, startY);
      ctx.lineTo(sx + bottomHalfW, h);
      ctx.lineTo(sx - bottomHalfW, h);
      ctx.closePath();
      ctx.fill();

      // Intense center beam core
      const coreGrad = ctx.createLinearGradient(sx, startY, sx, h);
      coreGrad.addColorStop(0, isCardSpecial ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.75)');
      coreGrad.addColorStop(0.6, isCardSpecial ? 'rgba(245, 158, 11, 0.4)' : 'rgba(253, 224, 71, 0.35)');
      coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.1)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.moveTo(sx - 15, startY);
      ctx.lineTo(sx + 15, startY);
      ctx.lineTo(sx + 45, h);
      ctx.lineTo(sx - 45, h);
      ctx.closePath();
      ctx.fill();

      // Vertical central laser ray pointing straight down
      ctx.strokeStyle = isCardSpecial ? 'rgba(254, 240, 138, 0.7)' : 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, startY);
      ctx.lineTo(sx, h);
      ctx.stroke();

      // Luminous oval light pool at the very bottom edge connecting directly into the card below
      ctx.fillStyle = isSpinning
        ? 'rgba(56, 189, 248, 0.6)'
        : isCardSpecial
        ? 'rgba(254, 240, 138, 0.95)'
        : 'rgba(253, 224, 71, 0.95)';
      ctx.beginPath();
      ctx.ellipse(sx, h - 2, 95, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. DRAW CARDS IN THE ORBIT WHEEL
    if (isSpinning) {
      // WHILE SPINNING: render pool cards rotating along the 3D orbit
      const total = cards.length;
      const cardItems = [];

      for (let i = 0; i < total; i++) {
        const theta = this.orbitAngle + (i * 2 * Math.PI) / total;
        const x = cx + Math.cos(theta) * rx;
        const y = cy + Math.sin(theta) * ry;
        const depth = Math.sin(theta);
        const scale = 0.65 + (depth + 1) * 0.25;
        const alpha = 0.35 + (depth + 1) * 0.32;

        cardItems.push({
          card: cards[i],
          x,
          y,
          depth,
          scale,
          alpha
        });
      }

      cardItems.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < cardItems.length; i++) {
        this.drawMiniCard(ctx, cardItems[i]);
      }
    } else {
      // WHEN STOPPED (KẾT QUẢ QUAY RA):
      // The 3 target cards sit prominently in the foreground under the 3 spotlights.
      // ALL other cards from the pool are STILL VISIBLE in the background along the rear elliptical rail!
      const cardItems = [];

      // 1. Gather remaining cards from the pool (cards that were not selected)
      const remainingCards = cards.filter(c => !targetCards.some(t => t.id === c.id));
      const totalRemaining = remainingCards.length;

      // Distribute remaining cards evenly across the back/sides arc of the orbit ellipse
      // Starting from left side around the rear top to right side
      const startAngle = 2.85; // ~163 degrees (left rear)
      const arcSpan = Math.PI * 2 - 2.5; // ~216 degrees span across rear

      for (let k = 0; k < totalRemaining; k++) {
        const theta = startAngle + (k / Math.max(1, totalRemaining - 1)) * arcSpan;
        const x = cx + Math.cos(theta) * rx;
        const y = cy + Math.sin(theta) * ry;
        const depth = Math.sin(theta); // Between -1.0 and 0.25 (behind the front cards)
        const scale = 0.58 + (depth + 1) * 0.16; // ~0.58 to 0.78
        const alpha = 0.42 + (depth + 1) * 0.22; // ~0.42 to 0.65

        cardItems.push({
          card: remainingCards[k],
          x,
          y,
          depth,
          scale,
          alpha,
          highlighted: false
        });
      }

      // 2. Add the 3 chosen result cards sitting in front directly above the 3 spotlights
      if (targetCards && targetCards.length === 3) {
        for (let i = 0; i < 3; i++) {
          cardItems.push({
            card: targetCards[i],
            x: slotXPositions[i],
            y: cardYPositions[i],
            depth: 1.0 + i * 0.01, // Foreground depth
            scale: 1.05,
            alpha: 1.0,
            highlighted: true
          });
        }
      }

      // 3. Sort by depth (back cards first, 3 winning cards in front)
      cardItems.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < cardItems.length; i++) {
        this.drawMiniCard(ctx, cardItems[i]);
      }
    }
  }

  /**
   * Helper to draw a miniature card on the orbit canvas
   */
  drawMiniCard(ctx, item) {
    const card = item.card;
    const cardW = 64 * item.scale;
    const cardH = 78 * item.scale;
    const isSpecial = card.type === 'SPECIAL';

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1.0, item.alpha));
    ctx.translate(item.x, item.y);

    // Card shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-cardW / 2 + 2, -cardH / 2 + 4, cardW, cardH, 8);
    ctx.fill();

    // Card Body
    if (isSpecial) {
      ctx.fillStyle = 'rgba(24, 16, 45, 0.98)';
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16 * item.scale;
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = item.highlighted ? '#fde047' : item.depth > 0.4 ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
      ctx.shadowColor = item.highlighted ? '#fde047' : '#38bdf8';
      ctx.shadowBlur = item.highlighted ? 14 : item.depth > 0.4 ? 6 * item.scale : 0;
    }

    ctx.lineWidth = isSpecial || item.highlighted ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Card Icon
    ctx.font = `${Math.round(22 * item.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, 0, -10 * item.scale);

    // Card Badge / Category text
    ctx.font = `bold ${Math.max(8, Math.round(9 * item.scale))}px sans-serif`;
    ctx.fillStyle = isSpecial ? '#fef08a' : item.highlighted ? '#38bdf8' : '#94a3b8';
    ctx.fillText(card.type, 0, 16 * item.scale);

    // Short label for result cards when stopped
    if (item.highlighted) {
      ctx.font = `bold ${Math.max(7, Math.round(8 * item.scale))}px sans-serif`;
      ctx.fillStyle = '#f8fafc';
      const shortTitle = card.title.replace(/^[^\w\s\u00C0-\u1EF9]+/, '').trim().slice(0, 11);
      ctx.fillText(shortTitle, 0, 27 * item.scale);
    }

    ctx.restore();
  }

  /**
   * Renders the 3 standard upgrade cards for normal level ups
   */
  renderCards(cards, player) {
    this.cardsContainerEl.innerHTML = '';
    this.currentCards = cards;
    this.selectedIndex = 0;
    this.isSelecting = true;
    this.player = player;

    cards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      const isSpecial = card.type === 'SPECIAL';
      cardEl.className = `upgrade-card ${isSpecial ? 'special' : ''}`;
      cardEl.style.animationDelay = `${index * 0.1}s`;

      cardEl.innerHTML = `
        <div class="card-badge ${card.type.toLowerCase()}">${card.type}</div>
        <div class="card-icon">${card.icon}</div>
        <h3 class="card-title">${card.title}</h3>
        <p class="card-desc">${card.description}</p>
      `;

      cardEl.addEventListener('mouseenter', () => {
        this.focusCardByIndex(index);
      });

      cardEl.addEventListener('mousemove', (e) => {
        if (this.lastMouseX !== e.clientX || this.lastMouseY !== e.clientY) {
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          if (this.selectedIndex !== index) {
            this.focusCardByIndex(index);
          }
        }
      });

      cardEl.addEventListener('click', () => {
        this.selectCardByIndex(index);
      });

      this.cardsContainerEl.appendChild(cardEl);
    });

    this.updateFocusedCard();
  }

  /**
   * Moves focus to the card without selecting/confirming
   */
  focusCardByIndex(index) {
    if (index < 0 || index >= this.currentCards.length) return;
    if (this.selectedIndex !== index) {
      soundManager.playWheelTick();
    }
    this.selectedIndex = index;
    this.updateFocusedCard();
  }

  /**
   * Applies card upgrade and cleans up modal
   */
  selectCardByIndex(index) {
    if (index < 0 || index >= this.currentCards.length) return;
    const card = this.currentCards[index];
    if (!card) return;

    this.isSelecting = false;
    soundManager.playSelect();
    card.apply(this.player, this.game);
    this.hide();
    if (this.onSelectCallback) {
      this.onSelectCallback(card);
    }
  }

  /**
   * Updates visual focus on the cards for keyboard and mouse navigation
   */
  updateFocusedCard() {
    const cards = this.cardsContainerEl.children;
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      if (i === this.selectedIndex) {
        el.classList.add('selected-card', 'keyboard-focused');
      } else {
        el.classList.remove('selected-card', 'keyboard-focused');
      }
    }
  }

  /**
   * Handles keyboard input when Level Up modal is active:
   * Keys 1, 2, 3 and Arrows only JUMP focus to that card (not choose yet).
   * Key ENTER or SPACE confirms and selects the card.
   */
  handleKeyDown(e) {
    if (!this.isSelecting || this.currentCards.length === 0) return false;

    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';

    // Phím 1: Chỉ nhảy sang thẻ 1 (chưa chọn)
    if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
      this.focusCardByIndex(0);
      return true;
    }

    // Phím 2: Chỉ nhảy sang thẻ 2 (chưa chọn)
    if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
      this.focusCardByIndex(1);
      return true;
    }

    // Phím 3: Chỉ nhảy sang thẻ 3 (chưa chọn)
    if (key === '3' || code === 'Digit3' || code === 'Numpad3') {
      this.focusCardByIndex(2);
      return true;
    }

    // Phím điều hướng Trái / A
    if (key === 'arrowleft' || code === 'ArrowLeft' || key === 'a' || code === 'KeyA') {
      const newIdx = (this.selectedIndex - 1 + this.currentCards.length) % this.currentCards.length;
      this.focusCardByIndex(newIdx);
      return true;
    }

    // Phím điều hướng Phải / D
    if (key === 'arrowright' || code === 'ArrowRight' || key === 'd' || code === 'KeyD') {
      const newIdx = (this.selectedIndex + 1) % this.currentCards.length;
      this.focusCardByIndex(newIdx);
      return true;
    }

    // Phím điều hướng Lên / W
    if (key === 'arrowup' || code === 'ArrowUp' || key === 'w' || code === 'KeyW') {
      const newIdx = (this.selectedIndex - 1 + this.currentCards.length) % this.currentCards.length;
      this.focusCardByIndex(newIdx);
      return true;
    }

    // Phím điều hướng Xuống / S
    if (key === 'arrowdown' || code === 'ArrowDown' || key === 's' || code === 'KeyS') {
      const newIdx = (this.selectedIndex + 1) % this.currentCards.length;
      this.focusCardByIndex(newIdx);
      return true;
    }

    // Phím ENTER hoặc SPACE: Chốt chọn thẻ đang focus
    if (key === 'enter' || code === 'Enter' || code === 'NumpadEnter' || key === ' ' || code === 'Space') {
      this.selectCardByIndex(this.selectedIndex);
      return true;
    }

    return false;
  }

  hide() {
    if (this.orbitAnimId) {
      cancelAnimationFrame(this.orbitAnimId);
      this.orbitAnimId = null;
    }
    this.isSelecting = false;
    this.currentCards = [];
    this.modalEl.classList.remove('visible');
    this.modalEl.classList.add('hidden');
  }
}


