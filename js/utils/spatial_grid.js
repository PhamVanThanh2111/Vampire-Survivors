/**
 * Spatial Hash Grid: High performance 2D spatial partitioning
 * Replaces O(N^2) pairwise distance scans with O(1) local bucket queries
 */
export class SpatialGrid {
  constructor(cellSize = 90) {
    this.cellSize = cellSize;
    this.buckets = new Map();
    this._reusableList = [];
  }

  clear() {
    this.buckets.clear();
  }

  _key(cx, cy) {
    return (cx << 16) ^ cy; // Fast integer hash key
  }

  insert(entity) {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const key = this._key(cx, cy);
    let list = this.buckets.get(key);
    if (!list) {
      list = [];
      this.buckets.set(key, list);
    }
    list.push(entity);
  }

  /**
   * Rebuilds grid from active entities
   */
  populate(entities) {
    this.clear();
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.isDead) {
        this.insert(e);
      }
    }
  }

  /**
   * Returns all entities in the 9 neighboring cells around (x, y)
   */
  queryNearby(x, y, out = null) {
    const result = out || [];
    result.length = 0;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = this.buckets.get(this._key(cx + dx, cy + dy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            result.push(list[i]);
          }
        }
      }
    }
    return result;
  }

  /**
   * Returns all entities overlapping the bounding box of circle (x, y, radius)
   */
  queryCircle(x, y, radius, out = null) {
    const result = out || [];
    result.length = 0;
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const list = this.buckets.get(this._key(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            result.push(list[i]);
          }
        }
      }
    }
    return result;
  }
}
