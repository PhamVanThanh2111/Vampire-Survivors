/**
 * Combat System: Auto-targeting, Circle-Circle collisions, damage calculation & resolution
 */

import { Vec2 } from '../utils/math.js';
import { MagicBolt } from '../entities/projectile.js';
import { Gem } from '../entities/gem.js';
import { soundManager } from '../utils/sound.js';

export class CombatSystem {
  constructor(particleManager) {
    this.particles = particleManager;
    this.targetRadius = 400; // Auto-targeting radius
    this.screenShake = 0;
  }

  /**
   * Updates combat routines: auto-firing, projectile collisions, blade impacts, player damage
   */
  update(dt, player, enemies, projectiles, gems, onLevelUp, onPlayerDied) {
    // 1. Auto-Weapon 1: Magic Bolt auto-targeting
    if (player.canShootBolt()) {
      const nearestEnemy = this.findNearestEnemy(player, enemies, this.targetRadius);
      if (nearestEnemy) {
        const damage = Math.round(player.boltDamage * player.damageMultiplier);
        projectiles.push(new MagicBolt(player.x, player.y, nearestEnemy.x, nearestEnemy.y, damage));
        soundManager.playShoot();
        player.resetBoltTimer();
      }
    }

    // 2. Projectile collisions vs Enemies
    for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = projectiles[pIdx];
      if (proj.isDead) continue;

      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const enemy = enemies[eIdx];
        if (enemy.isDead) continue;

        if (Vec2.circleIntersects(proj.x, proj.y, proj.radius, enemy.x, enemy.y, enemy.radius)) {
          proj.isDead = true;

          // Damage calculation with dynamic player critChance & critMultiplier
          const isCrit = Math.random() < player.critChance;
          const damage = Math.round(proj.damage * (isCrit ? player.critMultiplier : 1.0));
          const hitAngle = Vec2.angle(proj.x, proj.y, enemy.x, enemy.y);
          enemy.takeDamage(damage, hitAngle, 50);

          // Apply player status effects (Bleed, Freeze, Stun)
          this.applyPlayerStatusEffects(player, enemy);

          // Apply player lifesteal
          this.applyPlayerLifesteal(player, damage);

          // Visuals
          this.particles.spark(proj.x, proj.y, '#38bdf8', 5);
          this.particles.addFloatingText(enemy.x, enemy.y, `${damage}`, isCrit ? '#f43f5e' : '#facc15', isCrit);

          if (enemy.isDead) {
            this.handleEnemyDeath(enemy, gems);
          }
          break; // Projectile hit one enemy and consumed
        }
      }
    }

    // 3. Orbiting Blades collisions vs Enemies
    const blades = player.orbitingBlades;
    for (let bIdx = 0; bIdx < blades.length; bIdx++) {
      const blade = blades[bIdx];

      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const enemy = enemies[eIdx];
        if (enemy.isDead) continue;

        if (blade.canHit(enemy) && Vec2.circleIntersects(blade.x, blade.y, blade.radius, enemy.x, enemy.y, enemy.radius)) {
          blade.registerHit(enemy, 0.35);

          const isCrit = Math.random() < player.critChance;
          const damage = Math.round(blade.baseDamage * player.damageMultiplier * (isCrit ? player.critMultiplier : 1.0));
          const knockAngle = Vec2.angle(player.x, player.y, enemy.x, enemy.y);
          enemy.takeDamage(damage, knockAngle, 85);

          // Apply player status effects (Bleed, Freeze, Stun)
          this.applyPlayerStatusEffects(player, enemy);

          // Apply player lifesteal
          this.applyPlayerLifesteal(player, damage);

          soundManager.playBladeHit();
          this.particles.spark(blade.x, blade.y, '#f59e0b', 4);
          this.particles.addFloatingText(enemy.x, enemy.y, `${damage}`, '#fbbf24', isCrit);

          if (enemy.isDead) {
            this.handleEnemyDeath(enemy, gems);
          }
        }
      }
    }

    // 4. Process Status Effect ticks (Bleed DoT)
    for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
      const enemy = enemies[eIdx];
      if (enemy.isDead) continue;

      enemy.processBleed(dt, (bleedDmg, isFatal) => {
        this.particles.spark(enemy.x, enemy.y, '#ef4444', 3);
        this.particles.addFloatingText(enemy.x, enemy.y, `${bleedDmg}`, '#f43f5e', false);
        if (isFatal) {
          this.handleEnemyDeath(enemy, gems);
        }
      });
    }

    // 5. Enemy vs Player collisions (Body contact)
    for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
      const enemy = enemies[eIdx];
      if (enemy.isDead) continue;

      if (Vec2.circleIntersects(enemy.x, enemy.y, enemy.radius, player.x, player.y, player.radius)) {
        const damaged = player.takeDamage(enemy.touchDamage);
        if (damaged) {
          soundManager.playPlayerHurt();
          this.screenShake = 7; // Trigger screen shake
          this.particles.addFloatingText(player.x, player.y, `-${enemy.touchDamage}`, '#ef4444', true);
          this.particles.spark(player.x, player.y, '#ef4444', 6);

          if (player.hp <= 0 && onPlayerDied) {
            onPlayerDied();
            return;
          }
        }
      }
    }

    // 5. Gem collection & Level Up check
    for (let gIdx = gems.length - 1; gIdx >= 0; gIdx--) {
      const gem = gems[gIdx];
      if (gem.isCollected) {
        soundManager.playGemPickup();
        this.particles.spark(gem.x, gem.y, '#38bdf8', 3);
        const leveledUp = player.addExp(gem.value);
        gems.splice(gIdx, 1);

        if (leveledUp && onLevelUp) {
          soundManager.playLevelUp();
          this.particles.explode(player.x, player.y, '#38bdf8', 14, 2, 5);
          onLevelUp();
        }
      }
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
  }

  handleEnemyDeath(enemy, gems) {
    soundManager.playEnemyDeath();
    this.particles.explode(enemy.x, enemy.y, enemy.color, 9, 2, 4.5);
    // Drop EXP Gem at enemy position
    gems.push(new Gem(enemy.x, enemy.y, enemy.expValue, enemy.color === '#ef4444' ? '#f43f5e' : '#38bdf8'));
  }

  findNearestEnemy(player, enemies, maxRadius) {
    let nearest = null;
    let minDistSq = maxRadius * maxRadius;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.isDead) continue;

      const dSq = Vec2.distSq(player.x, player.y, enemy.x, enemy.y);
      if (dSq <= minDistSq) {
        minDistSq = dSq;
        nearest = enemy;
      }
    }

    return nearest;
  }

  applyPlayerStatusEffects(player, enemy) {
    // 1. Bleed proc
    if (player.bleedChance > 0 && Math.random() < player.bleedChance) {
      const bleedTickDamage = Math.max(3, Math.round(player.bleedDamage * player.damageMultiplier));
      enemy.applyBleed(bleedTickDamage, player.bleedDuration);
      this.particles.spark(enemy.x, enemy.y, '#dc2626', 3);
    }

    // 2. Freeze / Slow proc
    if (player.freezeChance > 0 && Math.random() < player.freezeChance) {
      enemy.applyFreeze(player.freezeSlowFactor, player.freezeDuration);
      this.particles.spark(enemy.x, enemy.y, '#38bdf8', 4);
    }

    // 3. Stun proc
    if (player.stunChance > 0 && Math.random() < player.stunChance) {
      enemy.applyStun(player.stunDuration);
      this.particles.spark(enemy.x, enemy.y, '#facc15', 4);
    }
  }

  /**
   * Resolves player lifesteal on successful hits
   */
  applyPlayerLifesteal(player, damage) {
    if (!player.lifesteal || player.lifesteal <= 0 || player.hp >= player.maxHp) return;

    const healAmount = damage * player.lifesteal;
    if (healAmount <= 0) return;

    player.heal(healAmount);

    // Subtle green heal text & spark over player (throttled to avoid visual clutter)
    const now = performance.now();
    if (!player._lastLifestealFx || now - player._lastLifestealFx > 300) {
      player._lastLifestealFx = now;
      const displayVal = healAmount >= 1 ? `+${Math.round(healAmount)}` : `+${healAmount.toFixed(1)}`;
      this.particles.addFloatingText(player.x, player.y - 18, displayVal, '#10b981', false);
      this.particles.spark(player.x, player.y, '#10b981', 3);
    }
  }
}
