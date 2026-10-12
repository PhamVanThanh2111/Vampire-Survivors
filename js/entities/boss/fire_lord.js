/**
 * Boss: Hoả Diệm Vương (Fire Lord Boss)
 * - Name: "Hoả diệm vương"
 * - Health: Multi-phase bar (x2 bars, 800 HP per bar = 1,600 Total HP)
 * - Skill: Shoots 3 fireballs into the air that rain down on marked ground telegraphs, dealing 35 damage each.
 */

import { Boss } from './boss.js';
import { FireballAttack } from './fireball.js';
import { Vec2 } from '../../utils/math.js';
import { soundManager } from '../../utils/sound.js?v=16';

export class FireLordBoss extends Boss {
  constructor(x, y) {
    super(x, y, {
      name: 'Hoả diệm vương',
      title: 'CHÚA TỂ LỬA',
      maxBars: 2, // 2 health bars (x2)
      barMaxHp: 500, // 500 HP per bar = 1,000 Total HP as requested
      speed: 60,
      radius: 38,
      color: '#dc2626',
      touchDamage: 26,
      expValue: 500,
      type: 'boss_fire_lord'
    });

    // Skill timers
    this.skillCooldown = 4.2; // Seconds between Triple Fireball casts
    this.skillTimer = 1.8; // First cast 1.8s after entering
    this.isCasting = false;
    this.castAnimTimer = 0;

    // Visual flame animation
    this.flamePulse = 0;
  }

  update(dt, player, spatialGrid = null, bounds = null, game = null) {
    if (this.isDead) return;

    this.flamePulse += dt * 6;

    // Base enemy movement & separation
    super.update(dt, player, spatialGrid, bounds);

    // Cast Timer
    this.skillTimer -= dt;
    if (this.skillTimer <= 0) {
      this.skillTimer = this.skillCooldown;
      this.castTripleFireballs(player, game);
    }

    if (this.isCasting) {
      this.castAnimTimer -= dt;
      if (this.castAnimTimer <= 0) {
        this.isCasting = false;
      }
    }
  }

  /**
   * Casts 3 fireballs into the air, landing at marked ground telegraphs around player
   */
  castTripleFireballs(player, game) {
    if (!game || !player || player.isDead) return;

    this.isCasting = true;
    this.castAnimTimer = 0.6;

    soundManager.playShoot();

    // Spawn 3 fireball attacks with slight offsets around player
    const offsets = [
      { x: 0, y: 0 }, // Directly centered on player
      { x: Vec2.randomRange(-70, 70), y: Vec2.randomRange(-60, 60) }, // Spread 1
      { x: Vec2.randomRange(-90, 90), y: Vec2.randomRange(-80, 80) }  // Spread 2
    ];

    for (let i = 0; i < 3; i++) {
      let targetX = player.x + offsets[i].x;
      let targetY = player.y + offsets[i].y;

      // Keep within arena map bounds
      if (game.mapWidth && game.mapHeight) {
        targetX = Math.max(50, Math.min(game.mapWidth - 50, targetX));
        targetY = Math.max(50, Math.min(game.mapHeight - 50, targetY));
      }

      // Slightly stagger the delay (1.2s, 1.35s, 1.5s) for a dramatic rainfall effect!
      const delay = 1.2 + i * 0.18;
      const fireball = new FireballAttack(targetX, targetY, 35, delay);

      if (game.bossAttacks) {
        game.bossAttacks.push(fireball);
      }
    }

    // Casting feedback text
    if (game.particles && typeof game.particles.addFloatingText === 'function') {
      game.particles.addFloatingText(this.x, this.y - 40, '🔥 HOẢ DIỆM GIÁNG LÂM!', '#f97316', true);
    }
  }

  onPhaseTransition(newBar) {
    super.onPhaseTransition(newBar);
    // Enrage slightly on final bar (speed up by 15%)
    this.speed = Math.round(this.speed * 1.15);
    this.skillCooldown = 3.5; // Casts fireballs faster in rage phase!
  }

  draw(ctx) {
    if (this.isDead) return;

    const isFlashing = this.hitFlashTimer > 0;
    const pulseScale = 1.0 + Math.sin(this.flamePulse) * 0.06;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulseScale, pulseScale);

    // 1. Fiery Outer Glow Aura
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Heavy Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.85, this.radius * 1.1, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Main Molten Demon Body
    ctx.fillStyle = isFlashing ? '#ffffff' : (this.currentBar === 1 ? '#b91c1c' : '#dc2626');
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dark Obsidian Armor rim
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 4. Burning Horns / Crown
    ctx.fillStyle = '#f97316';
    // Left horn
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.6, -this.radius * 0.5);
    ctx.quadraticCurveTo(-this.radius * 1.1, -this.radius * 1.3, -this.radius * 0.2, -this.radius * 0.9);
    ctx.closePath();
    ctx.fill();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.6, -this.radius * 0.5);
    ctx.quadraticCurveTo(this.radius * 1.1, -this.radius * 1.3, this.radius * 0.2, -this.radius * 0.9);
    ctx.closePath();
    ctx.fill();

    // 5. Molten Glowing Core
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 4, 14, 0, Math.PI * 2);
    ctx.fill();

    // 6. Glowing Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-11, -8, 4, 6, -0.2, 0, Math.PI * 2);
    ctx.ellipse(11, -8, 4, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 7. Overhead Boss Name & Mini Bar
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(`🐂 ${this.name}`, this.x, this.y - this.radius - 16);

    // Multiplier text
    if (this.currentBar > 1) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`(x${this.currentBar} HP)`, this.x, this.y - this.radius - 4);
    }
    ctx.restore();
  }
}
