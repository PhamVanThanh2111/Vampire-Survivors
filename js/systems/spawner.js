/**
 * Spawner System: Manages wave progression and enemy generation outside viewport
 */

import { ZombieEnemy, BatEnemy, BruteEnemy } from '../entities/regular_enemies.js';
import { Vec2 } from '../utils/math.js';

export class Spawner {
  constructor(canvasWidth = 1280, canvasHeight = 720) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.timer = 0;
    this.spawnInterval = 1.4; // Base seconds between spawns
    this.spawnTimer = 0;

    // Difficulty scaling
    this.difficultyTier = 0;
    this.batchSize = 2; // Number of enemies spawned per batch
    this.hpMultiplier = 1.0;
    this.maxEnemies = 70; // Dynamic cap on total active enemies
  }

  setViewport(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  reset() {
    this.timer = 0;
    this.spawnInterval = 1.4;
    this.spawnTimer = 0;
    this.difficultyTier = 0;
    this.batchSize = 2;
    this.hpMultiplier = 1.0;
    this.maxEnemies = 70;
  }

  update(dt, player, enemies, bounds = null, hasActiveBoss = false) {
    this.timer += dt;
    this.spawnTimer += dt;

    const minutes = this.timer / 60;
    this.difficultyTier = Math.floor(this.timer / 30);

    // 1. Balanced Batch Size: starts at 2, increases smoothly (+1 every ~45s), capped at 11
    this.batchSize = Math.min(11, 2 + Math.floor(this.timer / 45));

    // 2. Balanced Spawn Interval: starts at 1.4s, gradually scales down to 0.65s floor (at 7m: ~0.70s)
    this.spawnInterval = Math.max(0.65, 1.4 - minutes * 0.1);

    // 3. Balanced HP Multiplier: starts at 1.0, scales +0.2/min, capped at 2.5x (prevents bullet-sponge wall)
    this.hpMultiplier = Math.min(2.5, 1.0 + minutes * 0.2);

    // 4. Max Active Enemies Cap: starts at 70, scales gently up to 165 at 7m, capped at 180 max
    this.maxEnemies = Math.min(180, 70 + Math.floor(minutes * 15));

    // When Boss is active: drastically reduce regular mob spawns so player can focus on Boss!
    if (hasActiveBoss) {
      this.spawnInterval = 4.2; // 4.2s between spawns (much slower)
      this.batchSize = 1;       // Only 1 mob spawned per batch
      this.maxEnemies = 12;     // Cap mobs to at most 12
    }

    // 5. Cull distant enemies: Only when running on an unbounded infinite map
    if (!bounds) {
      const cullDistSq = 1500 * 1500;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        if (dx * dx + dy * dy > cullDistSq) {
          enemies.splice(i, 1);
        }
      }
    }

    // 6. Spawn wave when timer expires
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave(player, enemies, bounds);
    }
  }

  /**
   * Spawns a wave of enemies outside the screen bounds, respecting maxEnemies cap
   */
  spawnWave(player, enemies, bounds = null) {
    // If enemy count already reached max capacity, hold off spawning
    if (enemies.length >= this.maxEnemies) {
      return;
    }

    // Only spawn up to the remaining capacity to prevent sudden screen flooding
    const availableSlots = this.maxEnemies - enemies.length;
    const count = Math.min(this.batchSize, availableSlots);

    for (let i = 0; i < count; i++) {
      const pos = this.getRandomSpawnPosition(player, bounds);
      const enemy = this.createEnemyByTime(pos.x, pos.y);
      enemies.push(enemy);
    }
  }

  /**
   * Spawns enemies directly along the 4 outer perimeter edges of the arena map
   */
  getRandomSpawnPosition(player, bounds = null) {
    // Choose which map edge to spawn from: 0: Top, 1: Right, 2: Bottom, 3: Left
    const edge = Math.floor(Math.random() * 4);
    const borderInset = 22; // Spawn just inside the glowing barrier walls

    if (bounds) {
      let x = 0;
      let y = 0;

      switch (edge) {
        case 0: // Top edge of the arena map
          x = Vec2.randomRange(borderInset, bounds.width - borderInset);
          y = borderInset;
          break;
        case 1: // Right edge of the arena map
          x = bounds.width - borderInset;
          y = Vec2.randomRange(borderInset, bounds.height - borderInset);
          break;
        case 2: // Bottom edge of the arena map
          x = Vec2.randomRange(borderInset, bounds.width - borderInset);
          y = bounds.height - borderInset;
          break;
        case 3: // Left edge of the arena map
          x = borderInset;
          y = Vec2.randomRange(borderInset, bounds.height - borderInset);
          break;
      }

      return { x, y };
    }

    // Fallback: spawn relative to player viewport if bounds not provided
    const margin = 80;
    const halfW = this.canvasWidth / 2;
    const halfH = this.canvasHeight / 2;
    let x = 0;
    let y = 0;

    switch (edge) {
      case 0: // Top
        x = player.x + Vec2.randomRange(-halfW - margin, halfW + margin);
        y = player.y - halfH - margin;
        break;
      case 1: // Right
        x = player.x + halfW + margin;
        y = player.y + Vec2.randomRange(-halfH - margin, halfH + margin);
        break;
      case 2: // Bottom
        x = player.x + Vec2.randomRange(-halfW - margin, halfW + margin);
        y = player.y + halfH + margin;
        break;
      case 3: // Left
        x = player.x - halfW - margin;
        y = player.y + Vec2.randomRange(-halfH - margin, halfH + margin);
        break;
    }

    return { x, y };
  }

  /**
   * Selects enemy type depending on survival time with smooth progression
   */
  createEnemyByTime(x, y) {
    const time = this.timer;
    const roll = Math.random();

    if (time < 30) {
      // 0 - 30s: 85% Zombies, 15% Bats
      return roll < 0.85
        ? new ZombieEnemy(x, y, this.hpMultiplier)
        : new BatEnemy(x, y, this.hpMultiplier);
    } else if (time < 90) {
      // 30s - 1.5m: 70% Zombies, 25% Bats, 5% Brutes
      if (roll < 0.70) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.95) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    } else if (time < 240) {
      // 1.5m - 4m: 55% Zombies, 35% Bats, 10% Brutes
      if (roll < 0.55) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.90) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    } else if (time < 420) {
      // 4m - 7m: 50% Zombies, 35% Bats, 15% Brutes
      if (roll < 0.50) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.85) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    } else {
      // 7m+: 45% Zombies, 35% Bats, 20% Brutes
      if (roll < 0.45) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.80) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    }
  }
}
