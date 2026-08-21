import type { Vec2 } from "./math/vec2";
import { VIEW, WORLD } from "./types";

export function cameraOrigin(focus: Vec2): Vec2 {
  const maxX = Math.max(0, WORLD.width - VIEW.width);
  const maxY = Math.max(0, WORLD.height - VIEW.height);
  return {
    x: Math.min(maxX, Math.max(0, focus.x - VIEW.width / 2)),
    y: Math.min(maxY, Math.max(0, focus.y - VIEW.height / 2)),
  };
}

export function viewLayout(canvasW: number, canvasH: number) {
  const scale = Math.min(canvasW / VIEW.width, canvasH / VIEW.height);
  return {
    scale,
    ox: (canvasW - VIEW.width * scale) / 2,
    oy: (canvasH - VIEW.height * scale) / 2,
  };
}
