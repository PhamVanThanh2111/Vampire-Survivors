/**
 * Particle and Floating Text systems for visual effects
 */

import { Vec2 } from './math.js';

export class Particle {
  constructor(x, y, color, size, speed, angle, lifespan = 0.5) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.lifespan = lifespan;
    this.maxLifespan = lifespan;
    this.drag = 0.94; // Velocity deceleration
    this.isDead = false;
  }

  update(dt) {
    this.lifespan -= dt;
    if (this.lifespan <= 0) {
      this.isDead = true;
      return;
    }

    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.size = this.initialSize * (this.lifespan / this.maxLifespan);
  }

  draw(ctx) {
    const alpha = Math.max(0, this.lifespan / this.maxLifespan);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#facc15', isCrit = false, duration = 0.65) {
    this.x = x + (Math.random() - 0.5) * 16;
    this.y = y - 10;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.duration = duration;
    this.maxDuration = duration;
    this.vy = isCrit ? -60 : -45; // Drift upwards
    this.isDead = false;
  }

  update(dt) {
    this.duration -= dt;
    if (this.duration <= 0) {
      this.isDead = true;
      return;
    }
    this.y += this.vy * dt;
    this.vy *= 0.95; // Gentle slowdown
  }

  draw(ctx) {
    const progress = this.duration / this.maxDuration;
    const alpha = Math.min(1, progress * 1.5);
    ctx.globalAlpha = alpha;

    const fontSize = this.isCrit ? 18 : 13;
    ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, sans-serif`;

    const displayText = this.isCrit ? `💥 ${this.text}!` : this.text;

    // Fast high-contrast outline without expensive shadowBlur
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(displayText, this.x + 1.2, this.y + 1.2);

    ctx.fillStyle = this.color;
    ctx.fillText(displayText, this.x, this.y);
  }
}

export class ParticleManager {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.maxParticles = 60; // Hard cap to prevent particle lag spikes
    this.maxFloatingTexts = 30; // Hard cap on simultaneous damage text
  }

  /**
   * Spawns an explosion of particles at (x, y)
   */
  explode(x, y, color = '#e11d48', count = 8, minSpeed = 1, maxSpeed = 4) {
    const available = this.maxParticles - this.particles.length;
    if (available <= 0) return;
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + Vec2.randomRange(-0.3, 0.3);
      const speed = Vec2.randomRange(minSpeed, maxSpeed);
      const size = Vec2.randomRange(2, 4.5);
      const lifespan = Vec2.randomRange(0.3, 0.55);
      this.particles.push(new Particle(x, y, color, size, speed, angle, lifespan));
    }
  }

  /**
   * Spawns hit spark particles
   */
  spark(x, y, color = '#fef08a', count = 3) {
    const available = this.maxParticles - this.particles.length;
    if (available <= 0) return;
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
      const angle = Vec2.randomRange(0, Math.PI * 2);
      const speed = Vec2.randomRange(1.5, 3.5);
      const size = Vec2.randomRange(1.5, 3);
      const lifespan = Vec2.randomRange(0.18, 0.3);
      this.particles.push(new Particle(x, y, color, size, speed, angle, lifespan));
    }
  }

  /**
   * Add a floating damage text
   */
  addFloatingText(x, y, text, color = '#facc15', isCrit = false) {
    if (this.floatingTexts.length >= this.maxFloatingTexts) {
      this.floatingTexts.shift(); // Evict oldest text when capped
    }
    this.floatingTexts.push(new FloatingText(x, y, text, color, isCrit));
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.isDead) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update(dt);
      if (ft.isDead) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (this.particles.length === 0 && this.floatingTexts.length === 0) return;

    ctx.save();

    // 1. Batch draw all particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    // 2. Batch draw all floating damage texts
    if (this.floatingTexts.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < this.floatingTexts.length; i++) {
        this.floatingTexts[i].draw(ctx);
      }
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}
