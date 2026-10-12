/**
 * Drop Item Entity: Collectibles dropped by defeated enemies
 * Types:
 * - 'health': Cục máu hồi sinh lực (+25 HP) - hình dấu thập +
 * - 'damage': Tinh thể cường hóa sát thương (+3% Damage)
 * - 'max_hp': Trái tim sinh lực tăng máu tối đa (+5 Max HP, bảo lưu % máu)
 * - 'speed': Lông vũ phong hành (+4 px/s Tốc độ di chuyển)
 * - 'vacuum': Nam châm ma pháp tức thời (Hút toàn bộ gem trên sàn đấu)
 * - 'freeze': Đồng hồ sương giá (Đóng băng toàn bộ quái vật trong 2.5s)
 */

import { Vec2 } from '../utils/math.js';

export class DropItem {
  constructor(x, y, type = 'health') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 9;

    // Movement & Magnet attraction
    this.isAttracted = false;
    this.speed = 100;
    this.maxSpeed = 520;
    this.acceleration = 750;
    this.isCollected = false;

    // Floating bob animation
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobTimer = 0;

    // Config per type
    switch (type) {
      case 'health':
        this.color = '#ef4444';
        this.auraColor = 'rgba(239, 68, 68, 0.55)';
        this.label = '+25 HP';
        break;
      case 'damage':
        this.color = '#f97316';
        this.auraColor = 'rgba(249, 115, 22, 0.55)';
        this.label = '+3% DMG';
        break;
      case 'max_hp':
        this.color = '#ec4899';
        this.auraColor = 'rgba(236, 72, 153, 0.55)';
        this.label = '+5 Max HP';
        break;
      case 'speed':
        this.color = '#38bdf8';
        this.auraColor = 'rgba(56, 189, 248, 0.55)';
        this.label = '+4 Speed';
        break;
      case 'vacuum':
        this.color = '#a855f7';
        this.auraColor = 'rgba(168, 85, 247, 0.6)';
        this.label = 'Nam Châm';
        break;
      case 'freeze':
        this.color = '#06b6d4';
        this.auraColor = 'rgba(6, 182, 212, 0.6)';
        this.label = 'Đóng Băng';
        break;
      default:
        this.color = '#ef4444';
        this.auraColor = 'rgba(239, 68, 68, 0.55)';
        this.label = '+25 HP';
    }
  }

  static createRandom(x, y) {
    const roll = Math.random();
    let type = 'health';
    if (roll < 0.35) {
      type = 'health'; // 35% Cục máu (hình dấu +)
    } else if (roll < 0.55) {
      type = 'damage'; // 20% Tăng sát thương (+3%)
    } else if (roll < 0.72) {
      type = 'speed'; // 17% Tăng tốc độ (+4)
    } else if (roll < 0.85) {
      type = 'max_hp'; // 13% Tăng máu tối đa (+5)
    } else if (roll < 0.94) {
      type = 'vacuum'; // 9% Nam châm hút toàn bộ gem
    } else {
      type = 'freeze'; // 6% Đóng băng quái vật
    }
    return new DropItem(x, y, type);
  }

  update(dt, player) {
    if (this.isCollected) return;

    this.bobTimer += dt * 3.5;

    const dSq = Vec2.distSq(this.x, this.y, player.x, player.y);
    const magnetSq = (player.magnetRadius + 15) * (player.magnetRadius + 15);

    // Attract when within magnet range or already engaged
    if (dSq <= magnetSq || this.isAttracted) {
      this.isAttracted = true;
      const angle = Vec2.angle(this.x, this.y, player.x, player.y);
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);

      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;

      // Check collision with player body
      const pickupRadius = player.radius + this.radius + 6;
      if (dSq <= pickupRadius * pickupRadius) {
        this.isCollected = true;
      }
    }
  }

  draw(ctx) {
    if (this.isCollected) return;

    const bobY = Math.sin(this.bobTimer + this.bobOffset) * 2.8;
    const drawY = this.y + bobY;
    const pulse = 1.0 + Math.sin(this.bobTimer * 2) * 0.08;

    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(pulse, pulse);

    // Glowing aura
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    // Outer soft circular background
    ctx.fillStyle = this.auraColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner badge
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0; // reset shadow for crisp icon rendering

    // Draw specific icon inside
    switch (this.type) {
      case 'health':
        this.drawCross(ctx);
        break;
      case 'damage':
        this.drawSword(ctx);
        break;
      case 'max_hp':
        this.drawHeart(ctx);
        break;
      case 'speed':
        this.drawLightning(ctx);
        break;
      case 'vacuum':
        this.drawMagnet(ctx);
        break;
      case 'freeze':
        this.drawSnowflake(ctx);
        break;
    }

    ctx.restore();
  }

  /**
   * Cục máu: Dấu thập y tế + trắng nổi bật
   */
  drawCross(ctx) {
    const w = 2.4;
    const h = 5.5;
    ctx.fillStyle = '#ffffff';

    // Vertical bar
    ctx.fillRect(-w / 2, -h, w, h * 2);
    // Horizontal bar
    ctx.fillRect(-h, -w / 2, h * 2, w);
  }

  /**
   * Tăng damage: Thanh kiếm / lưỡi đao cam vàng
   */
  drawSword(ctx) {
    ctx.strokeStyle = '#f97316';
    ctx.fillStyle = '#fbbf24';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(2, -1);
    ctx.lineTo(0, 4);
    ctx.lineTo(-2, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Guard & hilt
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-3.5, 2);
    ctx.lineTo(3.5, 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 6);
    ctx.stroke();
  }

  /**
   * Tăng máu tối đa: Trái tim hồng ngọc
   */
  drawHeart(ctx) {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    const topCurveHeight = 3.5;
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(4.5, 2, 5.5, -2, 2.5, -4.5);
    ctx.bezierCurveTo(0.5, -5.5, 0, -2.5, 0, -2);
    ctx.bezierCurveTo(0, -2.5, -0.5, -5.5, -2.5, -4.5);
    ctx.bezierCurveTo(-5.5, -2, -4.5, 2, 0, 5);
    ctx.closePath();
    ctx.fill();

    // Inner bright shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1.5, -2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Tăng tốc độ: Tia sét vàng / xanh
   */
  drawLightning(ctx) {
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(1, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(-1, 6);
    ctx.lineTo(3, -1);
    ctx.lineTo(0, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Nam châm: Hình chữ U tím
   */
  drawMagnet(ctx) {
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 1, 3.5, 0, Math.PI, false);
    ctx.lineTo(-3.5, -4);
    ctx.moveTo(3.5, 1);
    ctx.lineTo(3.5, -4);
    ctx.stroke();

    // Red tips
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4.5, -5.5, 2.4, 2);
    ctx.fillRect(2.1, -5.5, 2.4, 2);
  }

  /**
   * Đóng băng: Bông tuyết cyan
   */
  drawSnowflake(ctx) {
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.4;

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(0, 5.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
