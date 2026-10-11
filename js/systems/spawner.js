/**
 * Spawner System: Manages wave progression and enemy generation outside viewport
 */

import { ZombieEnemy, BatEnemy, BruteEnemy } from '../entities/enemy.js';
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
  }

  setViewport(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  reset() {
    this.timer = 0;
    this.spawnInterval = 1.3;
    this.spawnTimer = 0;
    this.difficultyTier = 0;
    this.batchSize = 3;
    this.hpMultiplier = 1.0;
  }

  update(dt, player, enemies) {
    this.timer += dt;
    this.spawnTimer += dt;

    // Scaling difficulty every 30 seconds
    const currentTier = Math.floor(this.timer / 30);
    if (currentTier > this.difficultyTier) {
      const tiersGained = currentTier - this.difficultyTier;
      this.difficultyTier = currentTier;
      // Each 30s: Increase batch size by ~25%, increase enemy HP by 35%
      this.batchSize = Math.round(this.batchSize * Math.pow(1.25, tiersGained));
      this.hpMultiplier += 0.35 * tiersGained;
      this.spawnInterval = Math.max(0.4, this.spawnInterval * Math.pow(0.9, tiersGained));
    }

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave(player, enemies);
    }
  }

  /**
   * Spawns a wave of enemies outside the screen bounds
   */
  spawnWave(player, enemies) {
    const count = this.batchSize;
    for (let i = 0; i < count; i++) {
      const pos = this.getRandomSpawnPosition(player);
      const enemy = this.createEnemyByTime(pos.x, pos.y);
      enemies.push(enemy);
    }
  }

  /**
   * Calculates a spawn point just outside the viewport around the player or screen
   */
  getRandomSpawnPosition(player) {
    const margin = 80;
    // Choose which edge to spawn: 0: Top, 1: Right, 2: Bottom, 3: Left
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    // Relative to player coordinate center
    const halfW = this.canvasWidth / 2;
    const halfH = this.canvasHeight / 2;

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
   * Selects enemy type depending on survival time
   */
  createEnemyByTime(x, y) {
    const time = this.timer;
    const roll = Math.random();

    if (time < 25) {
      // First 25s: 85% Zombies, 15% Bats
      return roll < 0.85
        ? new ZombieEnemy(x, y, this.hpMultiplier)
        : new BatEnemy(x, y, this.hpMultiplier);
    } else if (time < 60) {
      // 25s - 60s: 60% Zombies, 30% Bats, 10% Brutes
      if (roll < 0.6) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.9) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    } else {
      // 60s+: Intense chaos! 45% Zombies, 35% Bats, 20% Brutes
      if (roll < 0.45) return new ZombieEnemy(x, y, this.hpMultiplier);
      if (roll < 0.8) return new BatEnemy(x, y, this.hpMultiplier);
      return new BruteEnemy(x, y, this.hpMultiplier);
    }
  }
}
