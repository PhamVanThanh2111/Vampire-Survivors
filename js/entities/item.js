/**
 * Drop Item Entity: Collectibles dropped by defeated enemies
 * Types & Visual Language:
 * - 'health': Hồi phục sinh lực (+25 HP) - Biểu tượng Dấu thập y tế (+) Xanh ngọc lục bảo (Emerald Green)
 * - 'max_hp': Tăng máu tối đa (+5 Max HP) - Biểu tượng Trái tim sinh mệnh Đỏ Ruby (Crimson Red)
 * - 'damage': Tăng sát thương (+3% Damage) - Biểu tượng Thanh kiếm chiến binh Cam lửa (Fiery Orange)
 * - 'speed': Tăng tốc độ (+4 px/s) - Biểu tượng Tia sét hoàng kim Vàng Neon (Electric Gold)
 * - 'vacuum': Nam châm hút toàn bộ ngọc EXP - Biểu tượng Nam châm chữ U Tím ma thuật (Mystic Violet)
 * - 'freeze': Đóng băng toàn bộ quái vật - Biểu tượng Bông tuyết sương giá Xanh băng (Frost Cyan)
 */

import { Vec2 } from '../utils/math.js';

export class DropItem {
  constructor(x, y, type = 'health') {
    this.x = x;
    this.y = y;
    this.type = type;
    // Tăng kích thước item để nổi bật hơn và dễ quan sát trong chiến đấu (trước đây là 9)
    this.radius = 14.5;

    // Movement & Magnet attraction
    this.isAttracted = false;
    this.speed = 100;
    this.maxSpeed = 540;
    this.acceleration = 780;
    this.isCollected = false;

    // Floating bob & pulse animation
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobTimer = 0;

    // Config palette & identity per type
    switch (type) {
      case 'health':
        // Hồi máu: Xanh ngọc lục bảo sinh mệnh tươi sáng
        this.color = '#22c55e';
        this.secondaryColor = '#4ade80';
        this.auraColor = 'rgba(34, 197, 94, 0.45)';
        this.label = '+25 HP';
        break;
      case 'max_hp':
        // Máu tối đa: Đỏ ruby rực rỡ
        this.color = '#ef4444';
        this.secondaryColor = '#f87171';
        this.auraColor = 'rgba(239, 68, 68, 0.5)';
        this.label = '+5 Max HP';
        break;
      case 'damage':
        // Sát thương: Cam lửa chiến binh
        this.color = '#f97316';
        this.secondaryColor = '#fb923c';
        this.auraColor = 'rgba(249, 115, 22, 0.45)';
        this.label = '+3% DMG';
        break;
      case 'speed':
        // Tốc độ: Vàng hoàng kim / sét điện
        this.color = '#eab308';
        this.secondaryColor = '#facc15';
        this.auraColor = 'rgba(234, 179, 8, 0.45)';
        this.label = '+4 Tốc Độ';
        break;
      case 'vacuum':
        // Nam châm: Tím ma thuật quyến rũ
        this.color = '#a855f7';
        this.secondaryColor = '#c084fc';
        this.auraColor = 'rgba(168, 85, 247, 0.5)';
        this.label = 'Nam Châm';
        break;
      case 'freeze':
        // Đóng băng: Xanh tuyết sương giá
        this.color = '#06b6d4';
        this.secondaryColor = '#67e8f9';
        this.auraColor = 'rgba(6, 182, 212, 0.5)';
        this.label = 'Đóng Băng';
        break;
      default:
        this.color = '#22c55e';
        this.secondaryColor = '#4ade80';
        this.auraColor = 'rgba(34, 197, 94, 0.45)';
        this.label = '+25 HP';
    }
  }

  static createRandom(x, y) {
    const roll = Math.random();
    let type = 'health';
    if (roll < 0.35) {
      type = 'health'; // 35% Cục hồi máu (Dấu + xanh lá)
    } else if (roll < 0.55) {
      type = 'damage'; // 20% Tăng sát thương (+3% Kiếm cam)
    } else if (roll < 0.72) {
      type = 'speed'; // 17% Tăng tốc độ (+4 Sét vàng)
    } else if (roll < 0.85) {
      type = 'max_hp'; // 13% Tăng máu tối đa (+5 Tim đỏ)
    } else if (roll < 0.94) {
      type = 'vacuum'; // 9% Nam châm hút toàn bộ ngọc (Tím)
    } else {
      type = 'freeze'; // 6% Đóng băng quái vật (Bông tuyết cyan)
    }
    return new DropItem(x, y, type);
  }

  update(dt, player) {
    if (this.isCollected) return;

    this.bobTimer += dt * 3.6;

    const dSq = Vec2.distSq(this.x, this.y, player.x, player.y);
    const magnetSq = (player.magnetRadius + 18) * (player.magnetRadius + 18);

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

    const bobY = Math.sin(this.bobTimer + this.bobOffset) * 3.2;
    const drawY = this.y + bobY;
    const pulse = 1.0 + Math.sin(this.bobTimer * 2.2) * 0.07;
    const ringPulse = (Math.sin(this.bobTimer * 1.8) + 1) * 0.5; // 0..1

    // 1. Ground Shadow (Bóng đổ trên mặt đất tạo chiều sâu không gian)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    const shadowScale = 1.0 - (bobY + 3.2) * 0.05;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius + 4, (this.radius - 2) * shadowScale, 3.8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Main Item Badge & Glowing Effects
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(pulse, pulse);

    // Expanding soft aura ring
    ctx.fillStyle = this.auraColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 3.5 + ringPulse * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer luminous glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    // Outer rim border
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Inner badge plate (Dark metallic background with radial contrast)
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner subtle glowing circle
    ctx.fillStyle = this.auraColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0; // Tắt shadow để icon bên trong sắc nét, không bị nhòe

    // 3. Draw specific high-contrast intuitive icon
    switch (this.type) {
      case 'health':
        this.drawCross(ctx);
        break;
      case 'max_hp':
        this.drawHeart(ctx);
        break;
      case 'damage':
        this.drawSword(ctx);
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

    // 4. Subtle glossy shine reflection on top edge of badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.45, this.radius * 0.65, Math.PI * 0.85, Math.PI * 2.15, false);
    ctx.lineTo(0, -this.radius * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Hồi Máu (+25 HP): Dấu Thập Y Tế (+) Xanh ngọc lục bảo viền trắng nổi bật
   */
  drawCross(ctx) {
    const w = 4.2;
    const h = 9.2;
    const r = 1.4;

    // Green glow outline
    ctx.fillStyle = '#15803d';
    this.roundRect(ctx, -w / 2 - 0.9, -h - 0.9, w + 1.8, h * 2 + 1.8, r);
    this.roundRect(ctx, -h - 0.9, -w / 2 - 0.9, h * 2 + 1.8, w + 1.8, r);

    // Bright emerald cross body
    ctx.fillStyle = '#22c55e';
    this.roundRect(ctx, -w / 2, -h, w, h * 2, r);
    this.roundRect(ctx, -h, -w / 2, h * 2, w, r);

    // Pure white center highlight
    ctx.fillStyle = '#ffffff';
    const innerW = 2.2;
    const innerH = 6.8;
    this.roundRect(ctx, -innerW / 2, -innerH, innerW, innerH * 2, 0.8);
    this.roundRect(ctx, -innerH, -innerW / 2, innerH * 2, innerW, 0.8);
  }

  /**
   * Tăng Máu Tối Đa (+5 Max HP): Trái Tim Đỏ Ruby rực rỡ có điểm sáng 3D
   */
  drawHeart(ctx) {
    ctx.save();
    ctx.translate(0, -0.5);

    // Dark crimson outline
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(0, 8.8);
    ctx.bezierCurveTo(7.8, 3.8, 9.4, -3.8, 4.4, -7.5);
    ctx.bezierCurveTo(1.2, -9.0, 0, -4.5, 0, -3.8);
    ctx.bezierCurveTo(0, -4.5, -1.2, -9.0, -4.4, -7.5);
    ctx.bezierCurveTo(-9.4, -3.8, -7.8, 3.8, 0, 8.8);
    ctx.closePath();
    ctx.fill();

    // Vibrant red heart body
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 7.6);
    ctx.bezierCurveTo(6.8, 3.0, 8.2, -3.2, 3.8, -6.5);
    ctx.bezierCurveTo(1.0, -7.8, 0, -3.8, 0, -3.2);
    ctx.bezierCurveTo(0, -3.8, -1.0, -7.8, -3.8, -6.5);
    ctx.bezierCurveTo(-8.2, -3.2, -6.8, 3.0, 0, 7.6);
    ctx.closePath();
    ctx.fill();

    // Inner bright gradient core
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(0, 5.2);
    ctx.bezierCurveTo(4.5, 2.0, 5.2, -2.0, 2.6, -4.2);
    ctx.bezierCurveTo(0.7, -5.2, 0, -2.4, 0, -2.0);
    ctx.bezierCurveTo(0, -2.4, -0.7, -5.2, -2.6, -4.2);
    ctx.bezierCurveTo(-5.2, -2.0, -4.5, 2.0, 0, 5.2);
    ctx.closePath();
    ctx.fill();

    // Glossy 3D shine dot on upper left lobe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-3.0, -4.0, 1.6, 1.1, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Tăng Sát Thương (+3% DMG): Lưỡi Kiếm Chiến Binh Cam Lửa sắc nhọn & chuôi kiếm
   */
  drawSword(ctx) {
    ctx.save();
    // Rotate blade slightly for a dynamic slash angle
    ctx.rotate(-Math.PI / 8);

    // Glowing orange blade
    ctx.fillStyle = '#fb923c';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(0, -9.5); // Tip
    ctx.lineTo(2.8, -1.5);
    ctx.lineTo(2.2, 4.0);
    ctx.lineTo(-2.2, 4.0);
    ctx.lineTo(-2.8, -1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central bright spine of blade
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(0, 3.5);
    ctx.stroke();

    // Crossguard (Thanh chắn kiếm)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.0;
    this.roundRect(ctx, -5.0, 4.0, 10.0, 2.2, 0.8);

    // Hilt / Handle & Pommel (Chuôi kiếm)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-1.1, 6.2, 2.2, 3.2);

    // Pommel jewel
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 9.8, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Tăng Tốc Độ (+4 Speed): Tia Sét Hoàng Kim Vàng Neon sắc bén
   */
  drawLightning(ctx) {
    ctx.save();
    ctx.translate(0, -0.5);

    // Dark golden glow outline
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'miter';

    // Yellow neon bolt body
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(1.8, -9.5);
    ctx.lineTo(-4.8, -0.5);
    ctx.lineTo(-0.5, -0.5);
    ctx.lineTo(-2.4, 9.5);
    ctx.lineTo(4.8, 0.2);
    ctx.lineTo(0.5, 0.2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Inner bright electric core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(1.2, -7.5);
    ctx.lineTo(-3.0, -1.2);
    ctx.lineTo(0.0, -1.2);
    ctx.lineTo(-1.2, 6.5);
    ctx.lineTo(3.0, -0.4);
    ctx.lineTo(0.4, -0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Nam Châm Hút Ngọc: Nam Châm Chữ U Tím Ma Thuật có sóng từ trường phát tán
   */
  drawMagnet(ctx) {
    ctx.save();

    // 1. Magnetic Field Wave Arcs (Sóng từ trường nhấp nháy phát tán phía trên 2 cực)
    const waveAlpha = 0.35 + Math.sin(this.bobTimer * 4.5) * 0.25;
    ctx.strokeStyle = `rgba(192, 132, 252, ${waveAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -5.5, 7.5, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    ctx.strokeStyle = `rgba(244, 63, 94, ${waveAlpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, -7.0, 9.8, Math.PI * 1.2, Math.PI * 1.8, false);
    ctx.stroke();

    // 2. Horseshoe Magnet U-Body
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'butt';

    ctx.beginPath();
    ctx.arc(0, 1.8, 4.8, 0, Math.PI, false);
    ctx.lineTo(-4.8, -4.5);
    ctx.moveTo(4.8, 1.8);
    ctx.lineTo(4.8, -4.5);
    ctx.stroke();

    // Inner metallic stroke
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 1.8, 4.8, 0, Math.PI, false);
    ctx.lineTo(-4.8, -4.5);
    ctx.moveTo(4.8, 1.8);
    ctx.lineTo(4.8, -4.5);
    ctx.stroke();

    // 3. Magnet Pole Tips (Hai cực Nam - Bắc: Đỏ Ruby & Trắng Bạc)
    // Left tip (Cực Đỏ)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-6.8, -7.5, 3.8, 3.2);

    // Right tip (Cực Xanh / Bạc)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(3.0, -7.5, 3.8, 3.2);

    // Tips shine edge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6.8, -7.5, 3.8, 0.9);
    ctx.fillRect(3.0, -7.5, 3.8, 0.9);

    ctx.restore();
  }

  /**
   * Đóng Băng Quái Vật: Bông Tuyết Băng Tinh Xanh Cyan Tinh Khiết
   */
  drawSnowflake(ctx) {
    ctx.save();
    // Rotate slowly for frosty snowflake sparkle
    ctx.rotate(this.bobTimer * 0.4);

    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    // 6 symmetrical snowflake arms with branchlets
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);

      // Main axis
      ctx.beginPath();
      ctx.moveTo(0, -8.2);
      ctx.lineTo(0, 8.2);
      ctx.stroke();

      // Branchlets (Nhánh phụ hướng ra ngoài)
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      // Upper branches
      ctx.moveTo(-2.8, -4.2);
      ctx.lineTo(0, -6.0);
      ctx.lineTo(2.8, -4.2);
      // Lower branches
      ctx.moveTo(-2.8, 4.2);
      ctx.lineTo(0, 6.0);
      ctx.lineTo(2.8, 4.2);
      ctx.stroke();

      ctx.restore();
    }

    // Glowing crystalline ice core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Helper vẽ hình chữ nhật bo tròn mềm mại
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
}

