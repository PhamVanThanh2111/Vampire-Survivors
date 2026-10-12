/**
 * Regular Enemies: Standard mob variants (Zombie, Bat, Brute)
 */

import { Enemy } from './base_enemy.js';

export class ZombieEnemy extends Enemy {
  constructor(x, y, hpMultiplier = 1.0) {
    super(x, y, {
      hp: Math.round(45 * hpMultiplier),
      speed: 80,
      radius: 14,
      color: '#22c55e',
      touchDamage: 12,
      expValue: 10,
      type: 'zombie'
    });
  }
}

export class BatEnemy extends Enemy {
  constructor(x, y, hpMultiplier = 1.0) {
    super(x, y, {
      hp: Math.round(24 * hpMultiplier),
      speed: 140,
      radius: 10,
      color: '#a855f7',
      touchDamage: 7,
      expValue: 10,
      type: 'bat'
    });
  }
}

export class BruteEnemy extends Enemy {
  constructor(x, y, hpMultiplier = 1.0) {
    super(x, y, {
      hp: Math.round(160 * hpMultiplier),
      speed: 45,
      radius: 22,
      color: '#ef4444',
      touchDamage: 24,
      expValue: 30,
      type: 'brute'
    });
  }
}
