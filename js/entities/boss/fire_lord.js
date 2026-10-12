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
      radius: 46, // Increased radius for an imposing, towering demon lord presence
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

    // Ambient floating embers & magma sparks around the Boss
    if (game && game.particles && typeof game.particles.spark === 'function') {
      if (Math.random() < 0.35) {
        game.particles.spark(
          this.x + Vec2.randomRange(-this.radius * 0.8, this.radius * 0.8),
          this.y + Vec2.randomRange(-this.radius * 0.8, this.radius * 0.8),
          this.currentBar === 1 ? '#fef08a' : '#f97316',
          1
        );
      }
    }

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
    const isEnraged = this.currentBar === 1;
    const pulseScale = 1.0 + Math.sin(this.flamePulse) * (isEnraged ? 0.08 : 0.05);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulseScale, pulseScale);

    // 1. Hellfire Outer Aura (Multi-layered burning radiant heatwaves)
    const auraR = this.radius + (isEnraged ? 24 : 18);
    const grad = ctx.createRadialGradient(0, 0, this.radius * 0.4, 0, 0, auraR);
    grad.addColorStop(0, isEnraged ? 'rgba(239, 68, 68, 0.42)' : 'rgba(249, 115, 22, 0.35)');
    grad.addColorStop(0.65, isEnraged ? 'rgba(185, 28, 28, 0.22)' : 'rgba(239, 68, 68, 0.16)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rotating Hellfire Orbiting Embers / Magma Orbs (Swirling flame wisps)
    const orbCount = isEnraged ? 4 : 3;
    const orbRadius = this.radius + 16;
    for (let i = 0; i < orbCount; i++) {
      const angle = this.flamePulse * (isEnraged ? 1.8 : 1.2) + (i * Math.PI * 2) / orbCount;
      const ox = Math.cos(angle) * orbRadius;
      const oy = Math.sin(angle) * (orbRadius * 0.65) + 6; // Tilted 3D orbit
      
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ox, oy, isEnraged ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(249, 115, 22, 0.65)';
      ctx.beginPath();
      ctx.arc(ox, oy, isEnraged ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Ground Heavy Obsidian Shadow with Magma Rim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.95, this.radius * 1.25, this.radius * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Heavy Spiked Shoulder Pauldrons (Giáp vai gai nhọn Obsidian)
    ctx.fillStyle = isFlashing ? '#ffffff' : (isEnraged ? '#450a0a' : '#1c1917');
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;

    // Left shoulder spike
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.65, -this.radius * 0.2);
    ctx.lineTo(-this.radius * 1.35, -this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.85, this.radius * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right shoulder spike
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.65, -this.radius * 0.2);
    ctx.lineTo(this.radius * 1.35, -this.radius * 0.5);
    ctx.lineTo(this.radius * 0.85, this.radius * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Epic Giant Buffalo Horns (Cặp sừng trâu uốn lượn uy dũng vươn cao)
    const hornBaseColor = isFlashing ? '#ffffff' : (isEnraged ? '#262626' : '#171717');
    
    // Left Buffalo Horn
    ctx.fillStyle = hornBaseColor;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.45, -this.radius * 0.6);
    // Sweeps wide out, then curves sharply upward
    ctx.bezierCurveTo(
      -this.radius * 1.3, -this.radius * 0.85,
      -this.radius * 1.65, -this.radius * 1.7,
      -this.radius * 0.5, -this.radius * 1.85
    );
    ctx.bezierCurveTo(
      -this.radius * 1.15, -this.radius * 1.45,
      -this.radius * 0.8, -this.radius * 0.85,
      -this.radius * 0.15, -this.radius * 0.7
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fiery molten tip on left horn
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.85, -this.radius * 1.6);
    ctx.lineTo(-this.radius * 0.5, -this.radius * 1.85);
    ctx.lineTo(-this.radius * 0.62, -this.radius * 1.5);
    ctx.closePath();
    ctx.fill();

    // Right Buffalo Horn
    ctx.fillStyle = hornBaseColor;
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.45, -this.radius * 0.6);
    ctx.bezierCurveTo(
      this.radius * 1.3, -this.radius * 0.85,
      this.radius * 1.65, -this.radius * 1.7,
      this.radius * 0.5, -this.radius * 1.85
    );
    ctx.bezierCurveTo(
      this.radius * 1.15, -this.radius * 1.45,
      this.radius * 0.8, -this.radius * 0.85,
      this.radius * 0.15, -this.radius * 0.7
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fiery molten tip on right horn
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.85, -this.radius * 1.6);
    ctx.lineTo(this.radius * 0.5, -this.radius * 1.85);
    ctx.lineTo(this.radius * 0.62, -this.radius * 1.5);
    ctx.closePath();
    ctx.fill();

    // 6. Main Heavy Armored Demon Body
    ctx.fillStyle = isFlashing ? '#ffffff' : (isEnraged ? '#991b1b' : '#b91c1c');
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dark Obsidian Armor rim
    ctx.strokeStyle = isEnraged ? '#f97316' : '#292524';
    ctx.lineWidth = isEnraged ? 4.5 : 4.0;
    ctx.stroke();

    // 7. Glowing Magma Veins / Cracks on Body (Vết nứt dung nham rực sáng)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.4);
    ctx.lineTo(-7, -4);
    ctx.lineTo(8, 12);
    ctx.lineTo(-2, this.radius * 0.68);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.5, 2);
    ctx.lineTo(-12, 10);
    ctx.moveTo(this.radius * 0.5, 2);
    ctx.lineTo(12, 10);
    ctx.stroke();

    // 8. Forehead Demonic Crest (Vương miện sừng giữa trán)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-11, -this.radius * 0.62);
    ctx.lineTo(0, -this.radius * 1.05);
    ctx.lineTo(11, -this.radius * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 9. Menacing Angled Demonic Eyes with Flame Brows (Mắt quỷ hung tợn)
    const eyeColor = isFlashing ? '#ffffff' : (isEnraged ? '#fef08a' : '#ffffff');
    ctx.fillStyle = eyeColor;
    
    // Left eye (angled sharply)
    ctx.beginPath();
    ctx.moveTo(-22, -9);
    ctx.lineTo(-10, -15);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-20, -4);
    ctx.closePath();
    ctx.fill();

    // Right eye (angled sharply)
    ctx.beginPath();
    ctx.moveTo(22, -9);
    ctx.lineTo(10, -15);
    ctx.lineTo(8, -7);
    ctx.lineTo(20, -4);
    ctx.closePath();
    ctx.fill();

    // Glowing Pupils
    ctx.fillStyle = isEnraged ? '#dc2626' : '#ea580c';
    ctx.beginPath();
    ctx.arc(-14, -9, 2.5, 0, Math.PI * 2);
    ctx.arc(14, -9, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 10. Molten Heart Core (Trái tim dung nham trung tâm)
    const corePulse = 13 + Math.sin(this.flamePulse * 2) * 3;
    const coreGrad = ctx.createRadialGradient(0, 10, 2, 0, 10, corePulse);
    coreGrad.addColorStop(0, '#fef08a');
    coreGrad.addColorStop(0.5, '#f97316');
    coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 10, corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 11. Overhead Boss Name & Multiplier Status
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 6;
    ctx.fillText(`🐂 ${this.name}`, this.x, this.y - this.radius - 20);

    // Multiplier text
    if (this.currentBar > 1) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`(x${this.currentBar} HP)`, this.x, this.y - this.radius - 6);
    }
    ctx.restore();
  }
}
