/**
 * Combat System: Auto-targeting, Circle-Circle collisions, damage calculation & resolution
 */

import { Vec2 } from '../utils/math.js';
import { MagicBolt } from '../entities/projectile.js';
import { Gem } from '../entities/gem.js';
import { DropItem } from '../entities/item.js';
import { soundManager } from '../utils/sound.js?v=16';

export class CombatSystem {
  constructor(particleManager) {
    this.particles = particleManager;
    this.targetRadius = 400; // Auto-targeting radius
    this.screenShake = 0;
  }

  /**
   * Updates combat routines: auto-firing, projectile collisions, blade impacts, player damage, items
   */
  update(dt, player, enemies, projectiles, gems, items, onLevelUp, onPlayerDied, gameInstance, spatialGrid = null) {
    // 1. Auto-Weapon 1: Magic Bolt auto-targeting
    if (player.canShootBolt()) {
      const candidates = spatialGrid ? spatialGrid.queryCircle(player.x, player.y, this.targetRadius) : enemies;
      const nearestEnemy = this.findNearestEnemy(player, candidates, this.targetRadius);
      if (nearestEnemy) {
        const damage = Math.round(player.boltDamage * player.damageMultiplier);
        projectiles.push(new MagicBolt(player.x, player.y, nearestEnemy.x, nearestEnemy.y, damage));
        soundManager.playShoot();
        player.resetBoltTimer();
      }
    }

    // 2. Projectile collisions vs Enemies (O(1) local query via SpatialGrid)
    for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = projectiles[pIdx];
      if (proj.isDead) continue;

      const candidates = spatialGrid ? spatialGrid.queryCircle(proj.x, proj.y, proj.radius + 20) : enemies;
      for (let eIdx = 0; eIdx < candidates.length; eIdx++) {
        const enemy = candidates[eIdx];
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
          this.particles.spark(proj.x, proj.y, '#38bdf8', 4);
          this.particles.addFloatingText(enemy.x, enemy.y, `${damage}`, isCrit ? '#f43f5e' : '#facc15', isCrit);

          if (enemy.isDead) {
            this.handleEnemyDeath(enemy, gems, items);
          }
          break; // Projectile hit one enemy and consumed
        }
      }
    }

    // 3. Orbiting Blades collisions vs Enemies (O(1) local query via SpatialGrid)
    const blades = player.orbitingBlades;
    for (let bIdx = 0; bIdx < blades.length; bIdx++) {
      const blade = blades[bIdx];
      const candidates = spatialGrid ? spatialGrid.queryCircle(blade.x, blade.y, blade.radius + 20) : enemies;

      for (let eIdx = 0; eIdx < candidates.length; eIdx++) {
        const enemy = candidates[eIdx];
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
          this.particles.spark(blade.x, blade.y, '#f59e0b', 3);
          this.particles.addFloatingText(enemy.x, enemy.y, `${damage}`, '#fbbf24', isCrit);

          if (enemy.isDead) {
            this.handleEnemyDeath(enemy, gems, items);
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
          this.handleEnemyDeath(enemy, gems, items);
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

    // 5.5 Item collection & effect resolution
    if (items) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.isCollected) {
          this.handleItemPickup(item, player, gems, enemies, gameInstance);
          items.splice(i, 1);
        }
      }
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
  }

  handleEnemyDeath(enemy, gems, items) {
    soundManager.playEnemyDeath();
    const particleCount = enemy.isBoss ? 28 : 9;
    const particleSpeed = enemy.isBoss ? 7 : 4.5;
    this.particles.explode(enemy.x, enemy.y, enemy.color, particleCount, 2, particleSpeed);
    
    // Drop EXP Gem at enemy position
    gems.push(new Gem(enemy.x, enemy.y, enemy.expValue, (enemy.color === '#ef4444' || enemy.isBoss) ? '#f43f5e' : '#38bdf8'));

    // Chance to drop a helpful item: Giảm 30% tỉ lệ rơi (Boss: 2-3 phần thưởng, Brute: 10.5%, Quái thường: ~3.8%)
    if (items) {
      if (enemy.isBoss) {
        items.push(DropItem.createRandom(enemy.x, enemy.y));
        items.push(DropItem.createRandom(enemy.x + 25, enemy.y + 12));
        if (Math.random() < 0.7) {
          items.push(DropItem.createRandom(enemy.x - 25, enemy.y - 12));
        }
      } else {
        // Giảm 30% so với trước (trước: brute 0.15, quái thường 0.055)
        const dropChance = enemy.type === 'brute' ? 0.105 : 0.038;
        if (Math.random() < dropChance) {
          items.push(DropItem.createRandom(enemy.x, enemy.y));
        }
      }
    }
  }

  /**
   * Resolves picked up item effects with audio, particles, and floating feedback
   */
  handleItemPickup(item, player, gems, enemies, gameInstance) {
    try {
      if (soundManager && typeof soundManager.playItemPickup === 'function') {
        soundManager.playItemPickup();
      } else if (soundManager && typeof soundManager.playGemPickup === 'function') {
        soundManager.playGemPickup();
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }

    switch (item.type) {
      case 'health': {
        const healAmt = 25;
        player.heal(healAmt);
        this.particles.spark(item.x, item.y, '#22c55e', 8);
        this.particles.addFloatingText(player.x, player.y - 20, `+${healAmt} HP`, '#22c55e', true);
        break;
      }
      case 'damage': {
        player.damageMultiplier = parseFloat((player.damageMultiplier + 0.03).toFixed(3));
        player.updateBlades();
        this.particles.spark(item.x, item.y, '#f97316', 8);
        this.particles.addFloatingText(player.x, player.y - 20, '+3% Sát Thương!', '#f97316', true);
        break;
      }
      case 'max_hp': {
        player.increaseMaxHp(5);
        this.particles.spark(item.x, item.y, '#ef4444', 8);
        this.particles.addFloatingText(player.x, player.y - 20, '+5 Máu Tối Đa!', '#ef4444', true);
        break;
      }
      case 'speed': {
        player.speed = Math.min(320, player.speed + 4);
        this.particles.spark(item.x, item.y, '#eab308', 8);
        this.particles.addFloatingText(player.x, player.y - 20, '+4 Tốc Độ!', '#eab308', true);
        break;
      }
      case 'vacuum': {
        if (gems && gems.length > 0) {
          for (let g = 0; g < gems.length; g++) {
            gems[g].isAttracted = true;
            gems[g].speed = 450;
          }
        }
        this.particles.explode(player.x, player.y, '#a855f7', 12, 2, 4);
        this.particles.addFloatingText(player.x, player.y - 20, '🧲 Hút Toàn Bộ Gem!', '#a855f7', true);
        break;
      }
      case 'freeze': {
        if (enemies && enemies.length > 0) {
          for (let e = 0; e < enemies.length; e++) {
            if (!enemies[e].isDead) {
              enemies[e].applyFreeze(0.9, 2.5);
            }
          }
        }
        this.particles.explode(player.x, player.y, '#06b6d4', 12, 2, 4);
        this.particles.addFloatingText(player.x, player.y - 20, '❄️ Đóng Băng Quái!', '#06b6d4', true);
        break;
      }
    }

    if (gameInstance && typeof gameInstance.renderPlayerStats === 'function') {
      gameInstance.renderPlayerStats(true);
    }
  }

  findNearestEnemy(player, enemies, maxRadius) {
    let nearest = null;
    let minDistSq = maxRadius * maxRadius;
    let foundBoss = null;
    let bossDistSq = (maxRadius * 1.35) * (maxRadius * 1.35);

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.isDead) continue;

      const dSq = Vec2.distSq(player.x, player.y, enemy.x, enemy.y);
      if (enemy.isBoss && dSq <= bossDistSq) {
        foundBoss = enemy;
      }
      if (dSq <= minDistSq) {
        minDistSq = dSq;
        nearest = enemy;
      }
    }

    // Prioritize Boss so player focus fires on the Boss rather than stray mobs
    if (foundBoss) return foundBoss;
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
