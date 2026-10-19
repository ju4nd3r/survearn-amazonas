export class SeededRandom {
  private state: number;

  constructor(seedInput: string | number) {
    this.state = typeof seedInput === 'number' ? seedInput : SeededRandom.hashString(seedInput);
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  public static hashString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * Returns a deterministic float in [0, 1) using Mulberry32.
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = Math.floor(this.next() * items.length);
    return items[idx]!;
  }

  /**
   * Deterministic 2D value noise in [0, 1] for coordinate (x, y)
   */
  public noise2D(x: number, y: number, seedOffset = 0): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);

    const n00 = this.latticeValue(ix, iy, seedOffset);
    const n10 = this.latticeValue(ix + 1, iy, seedOffset);
    const n01 = this.latticeValue(ix, iy + 1, seedOffset);
    const n11 = this.latticeValue(ix + 1, iy + 1, seedOffset);

    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  }

  private latticeValue(ix: number, iy: number, seedOffset: number): number {
    let n = ix * 374761393 + iy * 668265263 + (this.state ^ seedOffset) * 1442695041;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
}
