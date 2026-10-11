/**
 * Math utilities for 2D vectors and game calculations
 */

export const Vec2 = {
  /**
   * Distance between two points
   */
  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Squared distance between two points (faster for comparisons)
   */
  distSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  /**
   * Normalize a vector (x, y) to length 1
   */
  normalize(x, y) {
    const len = Math.hypot(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  /**
   * Angle between two points in radians
   */
  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * Linear interpolation between a and b
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Clamp value between min and max
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Random float between min and max
   */
  randomRange(min, max) {
    return min + Math.random() * (max - min);
  },

  /**
   * Random integer between min and max (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Circle vs Circle collision detection
   */
  circleIntersects(x1, y1, r1, x2, y2, r2) {
    const rSum = r1 + r2;
    return this.distSq(x1, y1, x2, y2) <= rSum * rSum;
  }
};
