import { cameraOrigin, viewLayout } from "../core/camera";
import type { GameState, InputSnapshot } from "../core/types";
import { WORLD } from "../core/types";

export class InputAdapter {
  private keys = new Set<string>();
  private mouse = { x: WORLD.width / 2, y: WORLD.height / 2, down: false, ult: false };
  private canvas: HTMLCanvasElement;
  private focus = { x: WORLD.width / 2, y: WORLD.height / 2 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    canvas.addEventListener("mousemove", (e) => this.setMouse(e));
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.mouse.ult = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.ult = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  sync(state: GameState): void {
    this.focus = state.player.position;
  }

  snapshot(): InputSnapshot {
    const moveX =
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
    const moveY =
      (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
      (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
    return {
      moveX,
      moveY,
      aimX: this.mouse.x,
      aimY: this.mouse.y,
      firing: this.mouse.down || this.keys.has("Space"),
      ult: this.keys.has("KeyQ") || this.keys.has("KeyE") || this.mouse.ult,
    };
  }

  private setMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const { scale, ox, oy } = viewLayout(rect.width, rect.height);
    const cam = cameraOrigin(this.focus);
    this.mouse.x = (e.clientX - rect.left - ox) / scale + cam.x;
    this.mouse.y = (e.clientY - rect.top - oy) / scale + cam.y;
  }
}
