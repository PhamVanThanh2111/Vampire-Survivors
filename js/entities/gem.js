/**
 * EXP Gem entity dropped by defeated enemies
 */

import { Vec2 } from '../utils/math.js';

export class Gem {
  constructor(x, y, value = 10, color = '#38bdf8') {
    this.x = x;
    this.y = y;
    this.value = value;
    this.color = color;
    this.radius = 6;
    this.isAttracted = false;
    this.speed = 120; // Initial magnet attraction speed
    this.maxSpeed = 550;
    this.acceleration = 700;
    this.isCollected = false;

    // Subtle bobbing animation
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobTimer = 0;
  }

  update(dt, player) {
    if (this.isCollected) return;

    this.bobTimer += dt * 4;

    const dSq = Vec2.distSq(this.x, this.y, player.x, player.y);
    const magnetSq = player.magnetRadius * player.magnetRadius;

    // Trigger magnet pull when within magnet range or already attracted
    if (dSq <= magnetSq || this.isAttracted) {
      this.isAttracted = true;
      const angle = Vec2.angle(this.x, this.y, player.x, player.y);
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);

      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;

      // Check pickup collision with player body
      const pickupRadius = player.radius + this.radius + 6;
      if (dSq <= pickupRadius * pickupRadius) {
        this.isCollected = true;
      }
    }
  }

  draw(ctx) {
    if (this.isCollected) return;

    const bobY = Math.sin(this.bobTimer + this.bobOffset) * 2;
    const drawY = this.y + bobY;

    ctx.save();
    ctx.translate(this.x, drawY);

    // Fast soft aura without expensive shadowBlur
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    // Draw diamond gem shape
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fill();

    // Inner highlight for a shiny crystalline look
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.5);
    ctx.lineTo(this.radius * 0.4, 0);
    ctx.lineTo(0, this.radius * 0.4);
    ctx.lineTo(-this.radius * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
