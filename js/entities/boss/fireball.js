/**
 * Boss Fireball Skill: Ground Telegraph & Falling Meteor Attack
 * Warns player with an expanding danger circle before slamming down, dealing 35 damage.
 */

import { Vec2 } from '../../utils/math.js';
import { soundManager } from '../../utils/sound.js?v=16';

export class FireballAttack {
  constructor(targetX, targetY, damage = 35, delay = 1.35) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.radius = 48; // Danger zone radius
    this.damage = damage; // 35 damage as requested
    this.delay = delay; // Time until impact in seconds
    this.timer = delay;
    this.isDead = false;

    // Visual animation
    this.runeAngle = Math.random() * Math.PI * 2;
    this.altitude = 380; // Starts 380px above ground
    this.initialAltitude = 380;
  }

  update(dt, player, particles, game = null) {
    if (this.isDead) return;

    this.timer -= dt;
    this.runeAngle += dt * 3.5;

    // Altitude descends as timer counts down
    const progress = Math.max(0, this.timer / this.delay);
    this.altitude = this.initialAltitude * progress;

    // Trail sparks falling from fireball
    if (this.altitude > 20 && particles && typeof particles.spark === 'function') {
      const curX = this.targetX;
      const curY = this.targetY - this.altitude;
      if (Math.random() < 0.6) {
        particles.spark(curX + Vec2.randomRange(-6, 6), curY, '#f97316', 1);
      }
    }

    // Impact detonation!
    if (this.timer <= 0) {
      this.detonate(player, particles, game);
    }
  }

  detonate(player, particles, game) {
    this.isDead = true;

    // 1. Play explosion sound
    if (typeof soundManager.playBombExplode === 'function') {
      soundManager.playBombExplode();
    }

    // 2. Fiery blast explosion particles
    if (particles) {
      if (typeof particles.explode === 'function') {
        particles.explode(this.targetX, this.targetY, '#ef4444', 14, 2.0, 5.0);
        particles.explode(this.targetX, this.targetY, '#f97316', 10, 1.5, 4.0);
      }
      if (typeof particles.spark === 'function') {
        particles.spark(this.targetX, this.targetY, '#fef08a', 8);
      }
    }

    // 3. Screen shake
    if (game && game.combat) {
      game.combat.screenShake = 12;
    }

    // 4. Check if player was inside the ground telegraph radius
    if (player && !player.isDead) {
      const dist = Vec2.dist(this.targetX, this.targetY, player.x, player.y);
      if (dist <= this.radius + player.radius) {
        const wasDamaged = player.takeDamage(this.damage);
        if (wasDamaged) {
          if (typeof soundManager.playPlayerHurt === 'function') {
            soundManager.playPlayerHurt();
          }
          if (particles && typeof particles.addFloatingText === 'function') {
            particles.addFloatingText(
              player.x,
              player.y - 18,
              `-${this.damage} HP (HOẢ CẦU)!`,
              '#ef4444',
              true
            );
          }
        }
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();

    const progress = Math.max(0, Math.min(1.0, 1.0 - this.timer / this.delay));

    // 1. Ground Telegraph Warning Decal (Marked danger circle)
    // Red semi-transparent outer fill
    ctx.fillStyle = `rgba(239, 68, 68, ${0.12 + progress * 0.18})`;
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Expanding fill ring signaling exact impact timing
    ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, this.radius * progress, 0, Math.PI * 2);
    ctx.fill();

    // Outer warning dashed line
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + progress * 0.4})`;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Warning flame glyph in center
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('🔥', this.targetX, this.targetY);

    // 2. Descending Fireball in the Air
    const curY = this.targetY - this.altitude;
    if (this.altitude > 0) {
      // Fiery core
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(this.targetX, curY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Inner molten center
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.targetX, curY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Flame tail pointing upwards
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.beginPath();
      ctx.moveTo(this.targetX - 10, curY);
      ctx.lineTo(this.targetX, curY - 26);
      ctx.lineTo(this.targetX + 10, curY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
