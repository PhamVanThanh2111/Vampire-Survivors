/**
 * Base Boss Class: Extensible architecture for multi-phase Boss fights
 * Supports N-bars of health (x2, x3, x5...), custom phase transitions, and unique skill casts.
 */

import { Enemy } from '../base_enemy.js';
import { Vec2 } from '../../utils/math.js';
import { soundManager } from '../../utils/sound.js?v=16';

export class Boss extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, {
      hp: options.barMaxHp || 100,
      speed: options.speed || 55,
      radius: options.radius || 36,
      color: options.color || '#ea580c',
      touchDamage: options.touchDamage || 28,
      expValue: options.expValue || 350,
      type: options.type || 'boss'
    });

    this.isBoss = true;
    this.name = options.name || 'Trùm Bóng Tối';
    this.title = options.title || 'CHÚA TỂ';

    // Multi-phase HP Bar System
    this.maxBars = options.maxBars || 2; // Supports 2, 3, 5... bars as requested
    this.currentBar = this.maxBars;
    this.barMaxHp = options.barMaxHp || 100;
    this.hp = this.barMaxHp;

    // Heavy boss physics (Immune to strong knockbacks)
    this.knockbackResistance = 0.88;

    // Phase transition animation timer
    this.phaseChangeTimer = 0;

    // Boss Skills tracking
    this.activeProjectiles = [];
  }

  takeDamage(amount, knockbackAngle = 0, knockbackForce = 0) {
    if (this.isDead) return false;

    // Heavy knockback dampening
    const effectiveForce = knockbackForce * (1.0 - this.knockbackResistance);
    this.knockbackVx += Math.cos(knockbackAngle) * effectiveForce;
    this.knockbackVy += Math.sin(knockbackAngle) * effectiveForce;
    this.hitFlashTimer = 0.12;

    this.hp -= amount;

    // Phase Bar Transition
    if (this.hp <= 0) {
      if (this.currentBar > 1) {
        // Drop down 1 bar (e.g. from x2 -> x1)
        this.currentBar--;
        this.hp = this.barMaxHp;
        this.phaseChangeTimer = 1.0;
        this.onPhaseTransition(this.currentBar);
      } else {
        // Last bar depleted -> Boss Defeated!
        this.hp = 0;
        this.currentBar = 0;
        this.isDead = true;
        this.onBossDefeated();
      }
    }

    return true;
  }

  /**
   * Hook called when a health bar is depleted and next bar takes over
   */
  onPhaseTransition(newBar) {
    soundManager.playLevelUp(); // Phase burst audio cue
  }

  /**
   * Hook called when boss is completely defeated
   */
  onBossDefeated() {
    soundManager.playBombExplode();
  }

  getHpPercent() {
    return Math.max(0, Math.min(100, (this.hp / this.barMaxHp) * 100));
  }

  getBarsRemaining() {
    return this.currentBar;
  }
}
