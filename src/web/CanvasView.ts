import { cameraOrigin, viewLayout } from "../core/camera";
import type { EnemyActor, FxParticle, GameState, ProjectileActor, UltBeam, UltZone } from "../core/types";
import { VIEW, WORLD } from "../core/types";

export class CanvasView {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas is required");
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state: GameState): void {
    const { ctx, canvas } = this;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const { scale, ox, oy } = viewLayout(w, h);
    const cam = cameraOrigin(state.player.position);
    const shakeStrength = state.shake * 0.5;
    const shakeX = Math.sin(state.time * 77) * shakeStrength;
    const shakeY = Math.cos(state.time * 63) * shakeStrength;

    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox + shakeX, oy + shakeY);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, VIEW.width, VIEW.height);
    ctx.clip();
    ctx.translate(-cam.x, -cam.y);

    this.drawArena();
    for (const pickup of state.pickups) this.drawPickup(pickup, state.time);
    for (const zone of state.zones) this.drawZone(zone);
    for (const particle of state.particles) this.drawParticle(particle);
    for (const enemy of state.enemies) this.drawEnemy(enemy);
    for (const shot of state.projectiles) this.drawShot(shot);
    for (const beam of state.beams) this.drawBeam(beam);
    this.drawPlayer(state);
    ctx.restore();

    this.drawMinimap(state, cam, w);
  }

  private drawArena(): void {
    const { ctx } = this;
    ctx.fillStyle = "#12151c";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = "#1f2633";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, WORLD.width - 24, WORLD.height - 24);

    ctx.strokeStyle = "rgba(80, 100, 140, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 80; x < WORLD.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 80; y < WORLD.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(76, 201, 240, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(WORLD.width / 2, WORLD.height / 2, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WORLD.width / 2 - 28, WORLD.height / 2);
    ctx.lineTo(WORLD.width / 2 + 28, WORLD.height / 2);
    ctx.moveTo(WORLD.width / 2, WORLD.height / 2 - 28);
    ctx.lineTo(WORLD.width / 2, WORLD.height / 2 + 28);
    ctx.stroke();
  }

  private drawMinimap(state: GameState, cam: { x: number; y: number }, canvasW: number): void {
    const { ctx } = this;
    const mmW = 220;
    const mmH = mmW * (WORLD.height / WORLD.width);
    const pad = 18;
    const x = canvasW - mmW - pad;
    const y = pad;
    const sx = mmW / WORLD.width;
    const sy = mmH / WORLD.height;

    ctx.fillStyle = "rgba(8, 10, 16, 0.82)";
    ctx.fillRect(x - 6, y - 6, mmW + 12, mmH + 12);
    ctx.strokeStyle = "#4cc9f0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 6, y - 6, mmW + 12, mmH + 12);

    ctx.fillStyle = "#161b24";
    ctx.fillRect(x, y, mmW, mmH);

    ctx.fillStyle = "rgba(76, 201, 240, 0.16)";
    ctx.fillRect(x + cam.x * sx, y + cam.y * sy, VIEW.width * sx, VIEW.height * sy);
    ctx.strokeStyle = "rgba(208, 244, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + cam.x * sx, y + cam.y * sy, VIEW.width * sx, VIEW.height * sy);

    for (const enemy of state.enemies) {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(x + enemy.position.x * sx, y + enemy.position.y * sy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pickup of state.pickups) {
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(x + pickup.position.x * sx - 2, y + pickup.position.y * sy - 2, 4, 4);
    }

    ctx.fillStyle = state.player.color;
    ctx.beginPath();
    ctx.arc(x + state.player.position.x * sx, y + state.player.position.y * sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d0f4ff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawPlayer(state: GameState): void {
    const { ctx } = this;
    const p = state.player.position;
    const f = state.player.facing;
    const angle = Math.atan2(f.y, f.x);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#2a3344";
    ctx.fillRect(6, -4, 22, 8);
    ctx.fillStyle = "#d7dee8";
    ctx.fillRect(20, -2.2, 10, 4.4);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(p.x, p.y, state.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = state.player.color;
    ctx.fill();
    ctx.strokeStyle = "#d0f4ff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawZone(zone: UltZone): void {
    const { ctx } = this;
    const a = Math.max(0.12, zone.life / zone.maxLife);
    ctx.beginPath();
    ctx.arc(zone.position.x, zone.position.y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = hexAlpha(zone.color, 0.16 * a);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(zone.color, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawBeam(beam: UltBeam): void {
    const { ctx } = this;
    const a = Math.max(0, beam.life / beam.maxLife);
    ctx.strokeStyle = beam.color;
    ctx.globalAlpha = 0.35 + a * 0.65;
    ctx.lineWidth = beam.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(beam.from.x, beam.from.y);
    ctx.lineTo(beam.to.x, beam.to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawEnemy(enemy: EnemyActor): void {
    const { ctx } = this;
    if (enemy.isBoss) {
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius + 9, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 71, 126, 0.72)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : enemy.color;
    ctx.fill();
    if (enemy.slowTimer > 0) {
      ctx.strokeStyle = "rgba(140, 210, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(enemy.position.x - enemy.radius, enemy.position.y - enemy.radius - 8, enemy.radius * 2, 4);
    ctx.fillStyle = "#7dffb3";
    ctx.fillRect(
      enemy.position.x - enemy.radius,
      enemy.position.y - enemy.radius - 8,
      enemy.radius * 2 * ratio,
      4,
    );
    if (enemy.isBoss) {
      ctx.fillStyle = "#ff477e";
      ctx.fillRect(
        enemy.position.x - enemy.radius,
        enemy.position.y - enemy.radius - 14,
        enemy.radius * 2 * ratio,
        5,
      );
      ctx.fillStyle = "#ffe3ec";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOSS", enemy.position.x, enemy.position.y - enemy.radius - 19);
    }
  }

  private drawPickup(pickup: { position: { x: number; y: number }; defId: string }, time: number): void {
    const { ctx } = this;
    const colors: Record<string, string> = {
      overclock: "#ffd166", haste: "#80ed99", breaker: "#90e0ef", vampire: "#ef476f",
      stim: "#06d6a0", aegis: "#48bfe3", battery: "#c77dff", mark: "#f4a261",
      frostpack: "#8ecae6", fortify: "#b8f2e6", scatter: "#ffb703", overheal: "#90be6d", hunter: "#ff6b6b",
    };
    const pulse = 13 + Math.sin(time * 4 + pickup.position.x) * 2;
    ctx.strokeStyle = colors[pickup.defId] ?? "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pickup.position.x, pickup.position.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${colors[pickup.defId] ?? "#ffffff"}55`;
    ctx.beginPath();
    ctx.arc(pickup.position.x, pickup.position.y, 8, 0, Math.PI * 2);
    ctx.fill();
    this.drawPickupIcon(pickup.defId, pickup.position.x, pickup.position.y);
  }

  private drawPickupIcon(defId: string, x: number, y: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#071018";
    ctx.fillStyle = "#071018";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (defId === "overclock" || defId === "battery") {
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 8);
      ctx.lineTo(5, -2);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
    } else if (defId === "haste") {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(3, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 4);
      ctx.stroke();
    } else if (defId === "stim" || defId === "overheal") {
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillRect(-7, -2, 14, 4);
    } else if (defId === "aegis" || defId === "fortify") {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, -5);
      ctx.lineTo(5, 4);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-7, -5);
      ctx.closePath();
      ctx.stroke();
    } else if (defId === "mark" || defId === "hunter") {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-5, 0);
      ctx.moveTo(5, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -5);
      ctx.moveTo(0, 5);
      ctx.lineTo(0, 8);
      ctx.stroke();
    } else if (defId === "breaker" || defId === "scatter") {
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(7, 5);
      ctx.moveTo(-7, 5);
      ctx.lineTo(7, -5);
      ctx.stroke();
    } else if (defId === "vampire") {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(7, 0, 5, 7, 0, 8);
      ctx.bezierCurveTo(-5, 7, -7, 0, 0, -8);
      ctx.fill();
    } else if (defId === "frostpack") {
      for (let angle = 0; angle < Math.PI; angle += Math.PI / 3) {
        const dx = Math.cos(angle) * 8;
        const dy = Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.moveTo(-dx, -dy);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawShot(shot: ProjectileActor): void {
    const { ctx } = this;
    const speed = Math.hypot(shot.velocity.x, shot.velocity.y) || 1;
    const nx = shot.velocity.x / speed;
    const ny = shot.velocity.y / speed;
    const len = shot.crit ? 18 : 14;
    ctx.strokeStyle = shot.crit ? "#ffffff" : "#ffe08a";
    ctx.lineWidth = shot.crit ? 4.5 : 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shot.position.x - nx * len, shot.position.y - ny * len);
    ctx.lineTo(shot.position.x + nx * 4, shot.position.y + ny * 4);
    ctx.stroke();
  }

  private drawParticle(p: FxParticle): void {
    const { ctx } = this;
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    if (p.kind === "burst") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius * (1.2 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius * (0.6 + a * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function hexAlpha(hex: string, alpha: number): string {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
