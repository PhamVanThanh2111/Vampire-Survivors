/**
 * Player Entity: 8-directional movement, stats, level/exp, weapon management
 */

import { Vec2 } from '../utils/math.js';
import { OrbitingBlade } from './projectile.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;

    // Base Stats
    this.maxHp = 100;
    this.hp = 100;
    this.speed = 200; // px/sec
    this.magnetRadius = 100;

    // Level & Progression
    this.level = 1;
    this.exp = 0;
    this.expToNextLevel = 25;

    // Weapon Stats & Modifiers
    this.damageMultiplier = 1.0;
    this.boltCooldown = 0.6; // Seconds between shots
    this.boltTimer = 0;
    this.boltDamage = 25;

    // Critical Hit System
    this.critChance = 0.10; // 10% base crit chance
    this.critMultiplier = 1.75; // 175% base crit damage

    // Status Effects (Bleed, Freeze/Slow, Stun)
    this.bleedChance = 0.0; // Chance to proc bleed (DoT)
    this.bleedDamage = 8; // Damage per tick
    this.bleedDuration = 3.0; // Bleed duration in seconds

    this.freezeChance = 0.0; // Chance to proc freeze / slow
    this.freezeSlowFactor = 0.35; // Slows enemy by 35%
    this.freezeDuration = 2.5; // Freeze duration in seconds

    this.stunChance = 0.0; // Chance to stun enemy
    this.stunDuration = 1.0; // Stun duration in seconds

    // Lifesteal (Hồi máu từ đòn đánh)
    this.lifesteal = 0.0; // Tỉ lệ hút máu (0.01 = 1%)

    // Orbiting Blades
    this.orbitingBlades = [];
    this.bladeCount = 1;
    this.bladeAngle = 0;
    this.bladeSpeed = 3.2; // Radian per second
    this.bladeDamage = 18;
    this.updateBlades();

    // State & Visuals
    this.facingAngle = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.invulnerableDuration = 0.4; // 0.4s mercy frames after taking hit
    this.flashAnimTimer = 0;

    // Special Skills System (Active & Passive skills from milestone roulette)
    this.specialSkills = [];
  }

  updateBlades() {
    this.orbitingBlades = [];
    for (let i = 0; i < this.bladeCount; i++) {
      this.orbitingBlades.push(new OrbitingBlade(72, this.bladeDamage * this.damageMultiplier));
    }
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return false;

    this.hp -= amount;
    this.invulnerableTimer = this.invulnerableDuration;
    if (this.hp <= 0) {
      this.hp = 0;
    }
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addExp(amount) {
    this.exp += amount;
    if (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.level++;
      // Formula for next level exp: increases progressively
      this.expToNextLevel = Math.round(this.expToNextLevel * 1.35 + 15);
      return true; // Triggered level up!
    }
    return false;
  }

  update(dt, input) {
    // 8-directional movement with vector normalization
    let moveX = 0;
    let moveY = 0;

    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const norm = Vec2.normalize(moveX, moveY);
      this.x += norm.x * this.speed * dt;
      this.y += norm.y * this.speed * dt;
      this.facingAngle = Math.atan2(norm.y, norm.x);
    }

    // Invulnerability timer decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      this.flashAnimTimer += dt * 25;
    } else {
      this.flashAnimTimer = 0;
    }

    // Orbiting blades rotation update
    this.bladeAngle += this.bladeSpeed * dt;
    const totalBlades = this.orbitingBlades.length;
    for (let i = 0; i < totalBlades; i++) {
      const offsetAngle = this.bladeAngle + (i * 2 * Math.PI) / totalBlades;
      this.orbitingBlades[i].update(dt, this.x, this.y, offsetAngle);
    }

    // Magic Bolt weapon cooldown timer
    this.boltTimer += dt;

    // Special Skills cooldown timer decay
    this.updateSpecialSkills(dt);
  }

  addSpecialSkill(skill) {
    if (skill.isActive) {
      const activeCount = this.getActiveSpecialSkills().length;
      skill.key = activeCount + 1; // Auto-assign key 1, 2, 3...
    }
    this.specialSkills.push(skill);
  }

  hasSpecialSkill(id) {
    return this.specialSkills.some(s => s.id === id);
  }

  getActiveSpecialSkills() {
    return this.specialSkills.filter(s => s.isActive);
  }

  updateSpecialSkills(dt) {
    for (let i = 0; i < this.specialSkills.length; i++) {
      const skill = this.specialSkills[i];
      if (skill.isActive && skill.cooldownTimer > 0) {
        skill.cooldownTimer = Math.max(0, skill.cooldownTimer - dt);
      }
    }
  }

  triggerSpecialSkillByKey(keyNumber, game) {
    const skill = this.specialSkills.find(s => s.isActive && s.key === keyNumber);
    if (skill && skill.cooldownTimer <= 0) {
      skill.cooldownTimer = skill.cooldown;
      if (skill.onActivate) {
        skill.onActivate(game, this);
      }
      return true;
    }
    return false;
  }

  canShootBolt() {
    return this.boltTimer >= this.boltCooldown;
  }

  resetBoltTimer() {
    this.boltTimer = 0;
  }

  draw(ctx) {
    // Blinking effect during invulnerability frames
    if (this.invulnerableTimer > 0 && Math.floor(this.flashAnimTimer) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Soft drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.9, this.radius * 1.1, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Magnet aura subtle pulse
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.magnetRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Neon hero outer glow
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;

    // Body base
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
    grad.addColorStop(0, '#67e8f9');
    grad.addColorStop(0.7, '#0284c7');
    grad.addColorStop(1, '#0369a1');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Gold/cyan armor border
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Directional visor / facing pointer
    ctx.rotate(this.facingAngle);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.radius * 0.65, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw orbiting blades
    const totalBlades = this.orbitingBlades.length;
    for (let i = 0; i < totalBlades; i++) {
      const offsetAngle = this.bladeAngle + (i * 2 * Math.PI) / totalBlades;
      this.orbitingBlades[i].draw(ctx, offsetAngle);
    }
  }
}
