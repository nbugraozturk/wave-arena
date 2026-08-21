export type Vec2 = { x: number; y: number };

export const vec = {
  create(x = 0, y = 0): Vec2 {
    return { x, y };
  },
  clone(v: Vec2): Vec2 {
    return { x: v.x, y: v.y };
  },
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },
  scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
  },
  length(v: Vec2): number {
    return Math.hypot(v.x, v.y);
  },
  normalize(v: Vec2): Vec2 {
    const len = Math.hypot(v.x, v.y);
    if (len <= 1e-8) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },
  dist(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  clampToRect(v: Vec2, w: number, h: number, margin: number): Vec2 {
    return {
      x: Math.min(w - margin, Math.max(margin, v.x)),
      y: Math.min(h - margin, Math.max(margin, v.y)),
    };
  },
  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },
  rotate(v: Vec2, angle: number): Vec2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  },
  perp(v: Vec2): Vec2 {
    return { x: -v.y, y: v.x };
  },
};
