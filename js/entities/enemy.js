/**
 * Enemies: Base Enemy & variants (Zombie, Bat, Brute)
 */

import { Vec2 } from '../utils/math.js';

export class Enemy {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.maxHp = options.hp || 20;
    this.hp = this.maxHp;
    this.speed = options.speed || 80;
    this.radius = options.radius || 14;
    this.color = options.color || '#22c55e';
    this.touchDamage = options.touchDamage || 10;
    this.expValue = options.expValue || 10;
    this.type = options.type || 'zombie';

    this.isDead = false;
    this.hitFlashTimer = 0; // Flash white when hit
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    // Status Effects
    this.bleedTimer = 0;
    this.bleedTickTimer = 0;
    this.bleedTickInterval = 0.5; // Every 0.5s ticks damage
    this.bleedDamagePerTick = 0;

    this.freezeTimer = 0;
    this.slowFactor = 0;
    this.frostTrail = [];
    this.trailSpawnTimer = 0;

    this.stunTimer = 0;

    // Animation timer for wings or walking wobble
    this.animTimer = Math.random() * 10;
  }

  applyBleed(dmgPerTick, duration = 3.0) {
    this.bleedTimer = Math.max(this.bleedTimer, duration);
    this.bleedDamagePerTick = Math.max(this.bleedDamagePerTick, dmgPerTick);
  }

  applyFreeze(slowFactor = 0.35, duration = 2.5) {
    this.freezeTimer = Math.max(this.freezeTimer, duration);
    this.slowFactor = Math.min(0.40, Math.max(this.slowFactor, slowFactor));
  }

  applyStun(duration = 1.2) {
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  processBleed(dt, onTick) {
    if (this.isDead || this.bleedTimer <= 0) return;

    this.bleedTimer -= dt;
    this.bleedTickTimer += dt;

    if (this.bleedTickTimer >= this.bleedTickInterval) {
      this.bleedTickTimer = 0;
      this.hp -= this.bleedDamagePerTick;
      this.hitFlashTimer = 0.05;

      const isFatal = this.hp <= 0;
      if (isFatal) {
        this.hp = 0;
        this.isDead = true;
      }

      if (onTick) {
        onTick(this.bleedDamagePerTick, isFatal);
      }
    }
  }

  takeDamage(amount, knockbackAngle = null, knockbackForce = 0) {
    this.hp -= amount;
    this.hitFlashTimer = 0.09; // White flash duration

    if (knockbackAngle !== null && knockbackForce > 0) {
      this.knockbackVx = Math.cos(knockbackAngle) * knockbackForce;
      this.knockbackVy = Math.sin(knockbackAngle) * knockbackForce;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
  }

  update(dt, player, enemies) {
    if (this.isDead) return;

    this.animTimer += dt * 8;

    // Decay hit flash
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    // Apply & decay knockback
    this.x += this.knockbackVx * dt;
    this.y += this.knockbackVy * dt;
    this.knockbackVx *= 0.88;
    this.knockbackVy *= 0.88;

    // Status effect timers
    const isStunned = this.stunTimer > 0;
    if (isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.stunTimer = 0;
    }

    const isFrozen = this.freezeTimer > 0;
    if (isFrozen) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) {
        this.freezeTimer = 0;
        this.slowFactor = 0;
      }
    }

    // Normalized vector towards player (stunned enemies cannot move)
    let vx = 0;
    let vy = 0;

    if (!isStunned) {
      const angleToPlayer = Vec2.angle(this.x, this.y, player.x, player.y);
      const speedScale = isFrozen ? Math.max(0.60, 1 - Math.min(0.35, this.slowFactor)) : 1.0;
      const effectiveSpeed = this.speed * speedScale;
      vx = Math.cos(angleToPlayer) * effectiveSpeed;
      vy = Math.sin(angleToPlayer) * effectiveSpeed;

      // Special movement modifiers per enemy type
      if (this.type === 'bat') {
        // Erratic fluttering side-to-side oscillation
        const flutter = Math.sin(this.animTimer) * 45 * speedScale;
        const perpAngle = angleToPlayer + Math.PI / 2;
        vx += Math.cos(perpAngle) * flutter;
        vy += Math.sin(perpAngle) * flutter;
      }

      // Soft separation from other enemies to avoid stacking into a single point
      if (enemies && enemies.length > 0) {
        let sepX = 0;
        let sepY = 0;
        let count = 0;

        for (let i = 0; i < enemies.length; i++) {
          const other = enemies[i];
          if (other === this || other.isDead) continue;

          const distSq = Vec2.distSq(this.x, this.y, other.x, other.y);
          const minDist = this.radius + other.radius;

          if (distSq < minDist * minDist && distSq > 0.001) {
            const d = Math.sqrt(distSq);
            const push = (minDist - d) / minDist;
            sepX += ((this.x - other.x) / d) * push * 40;
            sepY += ((this.y - other.y) / d) * push * 40;
            count++;
            if (count > 6) break; // Optimization limit
          }
        }

        const sepDamp = isFrozen ? 0.35 : 0.7;
        vx += sepX * sepDamp;
        vy += sepY * sepDamp;
      }
    }

    this.x += vx * dt;
    this.y += vy * dt;

    // Manage white frost trail when slowed
    for (let i = this.frostTrail.length - 1; i >= 0; i--) {
      const pt = this.frostTrail[i];
      pt.alpha -= dt * 2.2;
      pt.radius *= 0.94;
      if (pt.alpha <= 0.02) {
        this.frostTrail.splice(i, 1);
      }
    }

    if (isFrozen && (vx !== 0 || vy !== 0)) {
      this.trailSpawnTimer += dt;
      if (this.trailSpawnTimer >= 0.04) {
        this.trailSpawnTimer = 0;
        this.frostTrail.push({
          x: this.x,
          y: this.y,
          alpha: 0.7,
          radius: this.radius
        });
        if (this.frostTrail.length > 7) {
          this.frostTrail.shift();
        }
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw glowing white frosty trail/ghost effect behind slowed enemy
    if (this.frostTrail && this.frostTrail.length > 0) {
      for (let i = 0; i < this.frostTrail.length; i++) {
        const pt = this.frostTrail[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#e0f2fe';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.radius * 0.75), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const isFlashing = this.hitFlashTimer > 0;
    const isFrozen = this.freezeTimer > 0;
    const isBleeding = this.bleedTimer > 0;
    const isStunned = this.stunTimer > 0;

    // Status effect aura / glow
    if (isFrozen) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isBleeding) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + (isFrozen ? 6 : 3), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.8, this.radius * 0.9, this.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isFlashing ? '#ffffff' : this.color;
    ctx.beginPath();

    if (this.type === 'bat') {
      // Draw stylized Bat with flapping wings
      const wingFlap = Math.sin(this.animTimer) * 6;
      ctx.arc(0, 0, this.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.5, 0);
      ctx.quadraticCurveTo(-this.radius * 1.6, -this.radius + wingFlap, -this.radius * 2, 0);
      ctx.lineTo(-this.radius * 0.5, this.radius * 0.4);
      ctx.moveTo(this.radius * 0.5, 0);
      ctx.quadraticCurveTo(this.radius * 1.6, -this.radius + wingFlap, this.radius * 2, 0);
      ctx.lineTo(this.radius * 0.5, this.radius * 0.4);
      ctx.fill();

      // Red bat eyes
      ctx.fillStyle = isFlashing ? '#ffffff' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(-3, -2, 1.8, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'brute') {
      // Draw bulky Brute with spikes/armor
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer spiked rim or armor plates
      if (!isFlashing) {
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Glowing menacing eyes
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-5, -4, 2.5, 0, Math.PI * 2);
        ctx.arc(5, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Zombie - Regular chaser
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      if (!isFlashing) {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(-3.5, -2, 2, 0, Math.PI * 2);
        ctx.arc(3.5, -2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Health bar if damaged
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2.2;
      const barH = 3.5;
      const barY = -this.radius - 8;
      const hpPct = Math.max(0, this.hp / this.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, barY, barW, barH);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);
    }

    // Stun Indicator (Dizzy rotating stars)
    if (isStunned) {
      const stunY = -this.radius - 14;
      const starCount = 3;
      for (let s = 0; s < starCount; s++) {
        const starAngle = this.animTimer * 1.5 + (s * Math.PI * 2) / starCount;
        const sx = Math.cos(starAngle) * (this.radius * 0.7);
        const sy = stunY + Math.sin(starAngle) * 3;

        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}

/**
 * Factory for creating specific enemy variants
 */
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
