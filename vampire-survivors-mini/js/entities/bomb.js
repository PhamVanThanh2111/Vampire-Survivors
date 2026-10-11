/**
 * Bomb Entity: Active special skill weapon dropped by player
 * Detonates exactly 1.0s after planting, dealing massive AOE damage to all nearby enemies.
 * CAUTION: Can also damage the player if they don't run away in time!
 */

import { Vec2 } from '../utils/math.js';
import { soundManager } from '../utils/sound.js';

export class Bomb {
  constructor(x, y, damage = 350, blastRadius = 210, owner = null) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.blastRadius = blastRadius;
    this.owner = owner;

    this.fuseTime = 1.0; // Detonates in 1.0s after planting as requested
    this.fuseTimer = this.fuseTime;
    this.isDead = false;

    this.pulseAnim = 0;
    this.sparkTimer = 0;
  }

  update(dt, game) {
    if (this.isDead) return;

    this.fuseTimer -= dt;
    this.pulseAnim += dt * (5.0 + (1.0 - Math.max(0, this.fuseTimer)) * 12.0); // Accelerating pulse

    // Fuse sparks
    this.sparkTimer += dt;
    if (this.sparkTimer >= 0.1) {
      this.sparkTimer = 0;
      if (game && game.particles && typeof game.particles.spark === 'function') {
        game.particles.spark(this.x + 3, this.y - 16, '#f59e0b', 2);
      }
    }

    if (this.fuseTimer <= 0) {
      this.detonate(game);
    }
  }

  detonate(game) {
    this.isDead = true;

    // 1. Play massive booming explosion audio
    soundManager.playBombExplode();

    // 2. Trigger screen shake
    if (game && game.combat) {
      game.combat.screenShake = 18;
    }

    // 3. Spawn explosion particles
    if (game && game.particles) {
      if (typeof game.particles.explode === 'function') {
        game.particles.explode(this.x, this.y, '#ef4444', 18, 2.5, 6.0);
        game.particles.explode(this.x, this.y, '#f59e0b', 14, 1.5, 4.5);
      }
      if (typeof game.particles.spark === 'function') {
        game.particles.spark(this.x, this.y, '#fef08a', 10);
      }
    }

    // 4. Damage all enemies in blast radius
    if (game && game.enemies) {
      const player = game.player;
      for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];
        if (!enemy || enemy.isDead) continue;

        const dist = Vec2.dist(this.x, this.y, enemy.x, enemy.y);
        if (dist <= this.blastRadius + enemy.radius) {
          // Critical hit calculation
          const isCrit = player ? Math.random() < player.critChance : false;
          let finalDamage = this.damage;
          if (player) {
            finalDamage = Math.round(finalDamage * (isCrit ? player.critMultiplier : 1.0));
          }

          // Damage falloff from 100% center to 70% outer edge
          const falloff = 1.0 - (dist / (this.blastRadius + enemy.radius)) * 0.30;
          finalDamage = Math.max(1, Math.round(finalDamage * falloff));

          // Knockback angle radiating away from bomb center
          const hitAngle = Vec2.angle(this.x, this.y, enemy.x, enemy.y);
          enemy.takeDamage(finalDamage, hitAngle, 100);

          // Floating damage text
          if (game.particles && typeof game.particles.addFloatingText === 'function') {
            game.particles.addFloatingText(
              enemy.x,
              enemy.y - 10,
              `${finalDamage}`,
              isCrit ? '#f43f5e' : '#facc15',
              isCrit
            );
          }

          // Stun effect from concussion
          if (!enemy.isDead && typeof enemy.applyStun === 'function') {
            enemy.applyStun(1.5);
          }

          // Handle enemy death and exp gem drop
          if (enemy.isDead) {
            game.killCount++;
            if (game.combat && typeof game.combat.handleEnemyDeath === 'function') {
              game.combat.handleEnemyDeath(enemy, game.gems);
            }
            game.enemies.splice(i, 1);
          }
        }
      }
    }

    // 5. SELF-DAMAGE: Damage the player if they stayed inside blast radius!
    if (game && game.player && !game.player.isInvulnerable) {
      const playerDist = Vec2.dist(this.x, this.y, game.player.x, game.player.y);
      if (playerDist <= this.blastRadius + game.player.radius) {
        // Player failed to move away in time!
        const selfDamage = 35;
        const wasHurt = game.player.takeDamage(selfDamage);
        if (wasHurt) {
          if (typeof soundManager.playHurt === 'function') {
            soundManager.playHurt();
          } else if (typeof soundManager.playPlayerHurt === 'function') {
            soundManager.playPlayerHurt();
          }
          if (game.particles && typeof game.particles.addFloatingText === 'function') {
            game.particles.addFloatingText(
              game.player.x,
              game.player.y - 18,
              `-${selfDamage} HP (BOM TỰ NỔ)!`,
              '#ef4444',
              true
            );
          }
          if (game.player.hp <= 0 && typeof game.triggerGameOver === 'function') {
            game.triggerGameOver();
          }
        }
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();

    // 1. Warning Blast Radius on the ground
    const pulseFactor = 0.5 + Math.sin(this.pulseAnim) * 0.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.blastRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.08 + pulseFactor * 0.08})`;
    ctx.fill();

    ctx.lineWidth = 2.0 + pulseFactor * 1.5;
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulseFactor * 0.45})`;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Bomb Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bomb Body
    const flashRed = Math.sin(this.pulseAnim) > 0.1;
    ctx.translate(this.x, this.y);

    // Blast aura glow
    ctx.shadowColor = flashRed ? '#ef4444' : '#f59e0b';
    ctx.shadowBlur = 14 + pulseFactor * 12;

    // Outer spherical shell
    ctx.fillStyle = flashRed ? '#dc2626' : '#1e293b';
    ctx.strokeStyle = flashRed ? '#fca5a5' : '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner bomb cap & fuse neck
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-4, -18, 8, 4);

    // Fuse cord
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(6, -24, 4, -28);
    ctx.stroke();

    // Burning fuse spark
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(4, -28, 3.5 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();

    // Bomb Skull / Danger emblem in center
    ctx.fillStyle = flashRed ? '#ffffff' : '#f59e0b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 1);

    ctx.restore();
  }
}
