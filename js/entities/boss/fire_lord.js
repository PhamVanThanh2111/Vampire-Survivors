/**
 * Boss: Hoả Diệm Vương (Fire Lord Boss)
 * - Name: "Hoả diệm vương"
 * - Health: Multi-phase bar (x2 bars, 500 HP per bar = 1,000 Total HP)
 * - Exaggerated 4-Frame Walk Cycle & 3-Phase Skill Animations:
 *   1. Walk Cycle (assets/boss/fire_lord/walk_1..4.png):
 *      - Frame 1: Stride Contact (Right foot plants with heavy stomp, arm swinging).
 *      - Frame 2: Low Leg Lift (Left leg lifted naturally above floor, arm raised forward).
 *      - Frame 3: Stride Contact (Left foot plants with heavy stomp, arm swinging).
 *      - Frame 4: Low Leg Lift (Right leg lifted naturally above floor, other arm raised forward).
 *      - Footstep VFX: Emits fiery dust puffs and magma sparks on each footstep plant.
 *   2. Skill Cast - Hoả Diệm Giáng Lâm (3-Phase Action):
 *      - Windup / Charge (assets/boss/fire_lord/cast_charge.png):
 *        Rears back, raises both fists high above head holding swirling fireballs, roaring mouth open.
 *      - Ground Slam (assets/boss/fire_lord/cast_slam.png):
 *        Slams both armored fists into the ground with fire explosion, screen shake, and launching 3 meteors!
 *      - Recovery: Recovers posture and resumes heavy stomping pursuit.
 */

import { Boss } from './boss.js';
import { FireballAttack } from './fireball.js';
import { Vec2 } from '../../utils/math.js';
import { soundManager } from '../../utils/sound.js?v=16';

// Preload 4-frame walk cycle + 2-frame skill cast sprites
const spriteWalk1 = new Image();
spriteWalk1.src = 'assets/boss/fire_lord/walk_1.png?v=35';

const spriteWalk2 = new Image();
spriteWalk2.src = 'assets/boss/fire_lord/walk_2.png?v=35';

const spriteWalk3 = new Image();
spriteWalk3.src = 'assets/boss/fire_lord/walk_3.png?v=35';

const spriteWalk4 = new Image();
spriteWalk4.src = 'assets/boss/fire_lord/walk_4.png?v=35';

const spriteCastCharge = new Image();
spriteCastCharge.src = 'assets/boss/fire_lord/cast_charge.png?v=35';

const spriteCastSlam = new Image();
spriteCastSlam.src = 'assets/boss/fire_lord/cast_slam.png?v=35';

export class FireLordBoss extends Boss {
  constructor(x, y) {
    super(x, y, {
      name: 'Hoả diệm vương',
      title: 'CHÚA TỂ LỬA',
      maxBars: 2, // 2 health bars (x2)
      barMaxHp: 500, // 500 HP per bar = 1,000 Total HP
      speed: 60,
      radius: 52, // Majestic, imposing boss footprint
      color: '#dc2626',
      touchDamage: 26,
      expValue: 500,
      type: 'boss_fire_lord'
    });

    this.baseSpeed = 60;

    // Skill timers & State Machine
    this.skillCooldown = 4.5;
    this.skillTimer = 2.0; // First cast 2.0s after spawning
    this.castState = null; // null | 'windup' | 'slam' | 'recovery'
    this.castTimer = 0;
    this.targetPlayerRef = null;
    this.gameRef = null;

    // Movement & 4-Frame Walk Cycle
    this.facing = 1; // 1 = facing right, -1 = facing left
    this.walkCycle = 0;
    this.isWalking = false;
    this.currentWalkFrameIndex = 0;
    this.lastTriggeredFootIndex = -1;

    // Visual flame animation & floor VFX
    this.flamePulse = 0;
    this.shockwaves = [];
    this.footsteps = [];
  }

  update(dt, player, spatialGrid = null, bounds = null, game = null) {
    if (this.isDead) return;

    this.flamePulse += dt * 6;

    // 1. Update Floor VFX (shockwaves & footsteps)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.r += dt * 340;
      sw.alpha = Math.max(0, 1 - sw.r / sw.maxR);
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.footsteps.length - 1; i >= 0; i--) {
      const fs = this.footsteps[i];
      fs.life -= dt;
      if (fs.life <= 0) {
        this.footsteps.splice(i, 1);
      }
    }

    // 2. Adjust movement speed by cast state
    if (this.castState === 'windup') {
      this.speed = Math.round(this.baseSpeed * 0.1); // Halts to charge
    } else if (this.castState === 'slam') {
      this.speed = 0; // Frozen during ground slam
    } else if (this.castState === 'recovery') {
      this.speed = Math.round(this.baseSpeed * 0.35); // Regaining balance
    } else {
      this.speed = this.currentBar === 1 ? Math.round(this.baseSpeed * 1.15) : this.baseSpeed;
    }

    // 3. Movement execution & Stride Tracking
    const prevX = this.x;
    const prevY = this.y;
    super.update(dt, player, spatialGrid, bounds);

    const distMoved = Math.hypot(this.x - prevX, this.y - prevY);
    this.isWalking = distMoved > 0.04 && !this.castState;

    if (player) {
      // Turn towards player
      this.facing = player.x < this.x ? -1 : 1;
    }

    if (this.isWalking) {
      const walkRate = (this.currentBar === 1 ? 6.5 : 5.4);
      this.walkCycle += dt * walkRate;
      
      // Determine 4-frame index (0, 1, 2, 3)
      const normCycle = (this.walkCycle % (Math.PI * 2)) / (Math.PI * 2);
      this.currentWalkFrameIndex = Math.floor(normCycle * 4) % 4;

      // Footstep strike detection on contact frames (0 and 2)
      if (this.currentWalkFrameIndex === 0 && this.lastTriggeredFootIndex !== 0) {
        this.lastTriggeredFootIndex = 0;
        this.emitFootstepVFX(game, 1); // Right foot plant
      } else if (this.currentWalkFrameIndex === 2 && this.lastTriggeredFootIndex !== 2) {
        this.lastTriggeredFootIndex = 2;
        this.emitFootstepVFX(game, -1); // Left foot plant
      } else if (this.currentWalkFrameIndex === 1 || this.currentWalkFrameIndex === 3) {
        this.lastTriggeredFootIndex = -1; // Reset trigger for next plant
      }
    } else if (!this.castState) {
      this.currentWalkFrameIndex = 0;
      this.lastTriggeredFootIndex = -1;
    }

    // 4. Ambient floating embers & magma sparks around the Boss
    if (game && game.particles && typeof game.particles.spark === 'function') {
      if (Math.random() < 0.35) {
        game.particles.spark(
          this.x + Vec2.randomRange(-this.radius * 0.7, this.radius * 0.7),
          this.y + Vec2.randomRange(-this.radius * 0.7, this.radius * 0.7),
          this.currentBar === 1 ? '#fef08a' : '#f97316',
          1
        );
      }
    }

    // 5. Cast State Machine
    if (this.castState === 'windup') {
      this.castTimer -= dt;
      if (game && game.particles && Math.random() < 0.6) {
        game.particles.spark(
          this.x + Vec2.randomRange(-32, 32),
          this.y - 32 + Vec2.randomRange(-15, 15),
          '#fef08a',
          2
        );
      }
      if (this.castTimer <= 0) {
        this.executeCastSlam(this.targetPlayerRef || player, this.gameRef || game);
      }
    } else if (this.castState === 'slam') {
      this.castTimer -= dt;
      if (this.castTimer <= 0) {
        this.castState = 'recovery';
        this.castTimer = 0.30;
      }
    } else if (this.castState === 'recovery') {
      this.castTimer -= dt;
      if (this.castTimer <= 0) {
        this.castState = null;
      }
    } else {
      // Normal Cooldown
      this.skillTimer -= dt;
      if (this.skillTimer <= 0) {
        this.skillTimer = this.skillCooldown;
        this.startCastSequence(player, game);
      }
    }
  }

  /**
   * Spawns ground dust and fiery sparks when a hoof plants on the ground
   */
  emitFootstepVFX(game, side) {
    const footWorldX = this.x + side * 15 * this.facing;
    const footWorldY = this.y + 45;
    this.footsteps.push({
      x: footWorldX,
      y: footWorldY,
      r: 6,
      maxR: 22,
      life: 0.35,
      maxLife: 0.35
    });

    if (game && game.particles && typeof game.particles.spark === 'function') {
      game.particles.spark(footWorldX, footWorldY, '#f97316', 2);
    }
  }

  /**
   * Phase 1: Windup Charge (Rears back, raises fists high holding fireballs)
   */
  startCastSequence(player, game) {
    if (!player || player.isDead) return;

    this.castState = 'windup';
    this.castTimer = 0.55;
    this.targetPlayerRef = player;
    this.gameRef = game;

    soundManager.playShoot();

    if (game && game.particles && typeof game.particles.addFloatingText === 'function') {
      game.particles.addFloatingText(this.x, this.y - 50, '🔥 HOẢ DIỆM TỤ LỰC!', '#f59e0b', true);
    }
  }

  /**
   * Phase 2: Ground Slam Impact (Smashes both fists down, creates shockwave & launches meteors)
   */
  executeCastSlam(player, game) {
    this.castState = 'slam';
    this.castTimer = 0.35;

    if (typeof soundManager.playBombExplode === 'function') {
      soundManager.playBombExplode();
    } else {
      soundManager.playShoot();
    }

    if (game && game.combat) {
      game.combat.screenShake = 18;
    }

    this.shockwaves.push({
      x: this.x,
      y: this.y + 24,
      r: 14,
      maxR: 165,
      alpha: 1.0
    });

    if (game && game.particles) {
      if (typeof game.particles.explode === 'function') {
        game.particles.explode(this.x, this.y + 24, '#f97316', 12, 2, 5);
      }
      if (typeof game.particles.addFloatingText === 'function') {
        game.particles.addFloatingText(this.x, this.y - 50, '💥 THIÊN HOẢ BÙNG NỔ!', '#ef4444', true);
      }
    }

    this.fireTripleFireballs(player, game);
  }

  /**
   * Fires 3 fireballs into the air targeting ground zones around the player
   */
  fireTripleFireballs(player, game) {
    if (!game || !player || player.isDead) return;

    const offsets = [
      { x: 0, y: 0 },
      { x: Vec2.randomRange(-75, 75), y: Vec2.randomRange(-65, 65) },
      { x: Vec2.randomRange(-100, 100), y: Vec2.randomRange(-85, 85) }
    ];

    for (let i = 0; i < 3; i++) {
      let targetX = player.x + offsets[i].x;
      let targetY = player.y + offsets[i].y;

      if (game.mapWidth && game.mapHeight) {
        targetX = Math.max(50, Math.min(game.mapWidth - 50, targetX));
        targetY = Math.max(50, Math.min(game.mapHeight - 50, targetY));
      }

      const delay = 1.1 + i * 0.18;
      const fireball = new FireballAttack(targetX, targetY, 35, delay);

      if (game.bossAttacks) {
        game.bossAttacks.push(fireball);
      }
    }
  }

  onPhaseTransition(newBar) {
    super.onPhaseTransition(newBar);
    this.skillCooldown = 3.6; // Casts fireballs faster in rage phase
  }

  draw(ctx) {
    if (this.isDead) return;

    const isFlashing = this.hitFlashTimer > 0;
    const isEnraged = this.currentBar === 1;

    // 1. Draw Floor VFX (Footsteps & Shockwaves in World Coordinates)
    this.drawFloorVFX(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);

    // 2. Heavy Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.95, this.radius * 1.35, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Burning Fiery Floor Aura (Hellfire ground glow)
    const auraR = this.radius * (isEnraged ? 1.65 : 1.4);
    const auraGrad = ctx.createRadialGradient(0, 6, this.radius * 0.25, 0, 6, auraR);
    auraGrad.addColorStop(0, isEnraged ? 'rgba(239, 68, 68, 0.52)' : 'rgba(249, 115, 22, 0.42)');
    auraGrad.addColorStop(0.65, isEnraged ? 'rgba(185, 28, 28, 0.25)' : 'rgba(239, 68, 68, 0.18)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 6, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rotating Hellfire Magma Sparks / Orbs orbiting the boss
    const orbCount = isEnraged ? 4 : 3;
    const orbRadius = this.radius + 18;
    for (let i = 0; i < orbCount; i++) {
      const angle = this.flamePulse * (isEnraged ? 1.8 : 1.2) + (i * Math.PI * 2) / orbCount;
      const ox = Math.cos(angle) * orbRadius;
      const oy = Math.sin(angle) * (orbRadius * 0.6) + 6;
      
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ox, oy, isEnraged ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.beginPath();
      ctx.arc(ox, oy, isEnraged ? 8.5 : 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Select Sprite Frame & Motion Transforms
    let activeSprite = spriteWalk1;
    let bobY = 0;
    let tilt = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;

    if (this.castState === 'windup') {
      activeSprite = spriteCastCharge;
      const p = Math.min(1, Math.max(0, 1 - (this.castTimer / 0.55)));
      bobY = -p * 8;
      tilt = (Math.random() - 0.5) * 0.05 * p;
      scaleX = 1.0 - p * 0.06;
      scaleY = 1.0 + p * 0.14;
    } else if (this.castState === 'slam') {
      activeSprite = spriteCastSlam;
      const p = Math.min(1, Math.max(0, 1 - (this.castTimer / 0.35)));
      bobY = 8 * (1 - p * 0.4);
      tilt = 0;
      scaleX = 1.22 - p * 0.1;
      scaleY = 0.84 + p * 0.1;
    } else if (this.castState === 'recovery') {
      activeSprite = spriteCastSlam;
      const p = Math.min(1, Math.max(0, 1 - (this.castTimer / 0.30)));
      bobY = 4 * (1 - p);
      tilt = 0;
      scaleX = 1.12 * (1 - p) + 1.0 * p;
      scaleY = 0.94 * (1 - p) + 1.0 * p;
    } else {
      // Walk Cycle (4 Frames: Stride1, HighLift1, Stride2, HighLift2)
      if (this.isWalking) {
        switch (this.currentWalkFrameIndex) {
          case 0:
            activeSprite = spriteWalk1; // Right Foot Plant
            bobY = 1.5;
            tilt = 0.02;
            scaleX = 1.0;
            scaleY = 1.0;
            break;
          case 1:
            activeSprite = spriteWalk2; // Natural low foot lift & step forward
            bobY = -2;
            tilt = -0.02;
            scaleX = 1.0;
            scaleY = 1.0;
            break;
          case 2:
            activeSprite = spriteWalk3; // Left Foot Plant
            bobY = 1.5;
            tilt = -0.02;
            scaleX = 1.0;
            scaleY = 1.0;
            break;
          case 3:
            activeSprite = spriteWalk4; // Natural low foot lift & step forward
            bobY = -2;
            tilt = 0.02;
            scaleX = 1.0;
            scaleY = 1.0;
            break;
          default:
            activeSprite = spriteWalk1;
            break;
        }
      } else {
        // Idle breathing stance
        activeSprite = spriteWalk1;
        bobY = Math.sin(this.flamePulse) * 1.5;
        tilt = 0;
        scaleX = 1.0;
        scaleY = 1.0;
      }
    }

    // 6. Draw Directional Boss Sprite (Flipped towards player)
    ctx.save();
    ctx.scale(this.facing, 1);
    ctx.translate(0, bobY);
    ctx.rotate(tilt);
    ctx.scale(scaleX, scaleY);

    if (activeSprite && activeSprite.complete && activeSprite.naturalWidth !== 0) {
      const drawSize = this.radius * 2.85; // ~148px across
      
      if (isFlashing) {
        ctx.filter = 'brightness(3) contrast(1.5)';
      } else if (isEnraged) {
        ctx.filter = 'saturate(1.35) drop-shadow(0 0 14px #ef4444)';
      } else {
        ctx.filter = 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.75))';
      }

      ctx.drawImage(activeSprite, -drawSize / 2, -drawSize / 2 - 4, drawSize, drawSize);
      ctx.filter = 'none';
    } else {
      this.drawProceduralFallback(ctx, isFlashing, isEnraged);
    }

    ctx.restore(); // Restore directional mirror

    // 7. Overhead Boss Name & Status (NOT mirrored)
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 8;
    ctx.fillText(`🐂 ${this.name}`, 0, -this.radius - 22);

    if (this.currentBar > 1) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`(x${this.currentBar} HP)`, 0, -this.radius - 8);
    }

    ctx.restore();
  }

  /**
   * Draws expanding ground shockwave rings and footstep dust puffs in World Coordinates
   */
  drawFloorVFX(ctx) {
    // Footstep dust puffs
    for (let i = 0; i < this.footsteps.length; i++) {
      const fs = this.footsteps[i];
      const prog = 1 - Math.max(0, fs.life / fs.maxLife);
      const currentR = fs.r + (fs.maxR - fs.r) * prog;
      const alpha = Math.max(0, fs.life / fs.maxLife) * 0.55;

      ctx.save();
      ctx.fillStyle = `rgba(180, 83, 9, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(fs.x, fs.y, currentR, currentR * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 0.8})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // Slam Shockwave Rings
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const alpha = Math.max(0, sw.alpha);

      ctx.save();
      // Outer fiery expanding ring
      ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.9})`;
      ctx.lineWidth = Math.max(1, 4 * alpha);
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.r, sw.r * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright fiery core ring
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.lineWidth = Math.max(1, 2 * alpha);
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.r * 0.82, sw.r * 0.44, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Fallback procedural rendering while sprite is loading
   */
  drawProceduralFallback(ctx, isFlashing, isEnraged) {
    ctx.fillStyle = isFlashing ? '#ffffff' : (isEnraged ? '#991b1b' : '#b91c1c');
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-14, -8, 4, 0, Math.PI * 2);
    ctx.arc(14, -8, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
