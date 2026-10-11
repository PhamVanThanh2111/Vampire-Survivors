/**
 * Projectiles: Magic Bolt (linear fired projectile) & Orbiting Blade/Shield
 */

import { Vec2 } from '../utils/math.js';

export class MagicBolt {
  constructor(x, y, targetX, targetY, damage = 25, speed = 480) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed;
    this.radius = 5;
    this.color = '#38bdf8';
    this.isDead = false;

    const angle = Vec2.angle(x, y, targetX, targetY);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;

    this.lifespan = 1.6; // Max 1.6s lifetime
    this.trail = [];
  }

  update(dt) {
    if (this.isDead) return;

    this.lifespan -= dt;
    if (this.lifespan <= 0) {
      this.isDead = true;
      return;
    }

    // Save previous positions for trailing glow effect
    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > 5) {
      this.trail.shift();
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.8;
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      ctx.save();
      ctx.globalAlpha = pt.alpha * 0.45;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.radius * (0.4 + i * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Main bolt body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    // Outer plasma
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.8, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(2, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class OrbitingBlade {
  constructor(orbitRadius = 75, baseDamage = 18) {
    this.orbitRadius = orbitRadius;
    this.baseDamage = baseDamage;
    this.radius = 10; // Collision radius of the orb/blade
    this.x = 0;
    this.y = 0;
    this.color = '#f59e0b'; // Amber / golden energy
    // Cooldown map to avoid damaging the same enemy continuously every frame
    this.hitCooldowns = new Map();
  }

  update(dt, playerX, playerY, angle) {
    this.x = playerX + Math.cos(angle) * this.orbitRadius;
    this.y = playerY + Math.sin(angle) * this.orbitRadius;

    // Decrease enemy hit cooldown timers
    for (const [enemy, timer] of this.hitCooldowns.entries()) {
      const newTimer = timer - dt;
      if (newTimer <= 0) {
        this.hitCooldowns.delete(enemy);
      } else {
        this.hitCooldowns.set(enemy, newTimer);
      }
    }
  }

  canHit(enemy) {
    return !this.hitCooldowns.has(enemy);
  }

  registerHit(enemy, cooldown = 0.35) {
    this.hitCooldowns.set(enemy, cooldown);
  }

  draw(ctx, angle) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle + Math.PI / 2);

    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;

    // Energy blade / orb
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    // Teardrop/blade shape pointing outward
    ctx.moveTo(0, -this.radius * 1.5);
    ctx.lineTo(this.radius, this.radius * 0.8);
    ctx.lineTo(0, this.radius * 0.4);
    ctx.lineTo(-this.radius, this.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // Inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
