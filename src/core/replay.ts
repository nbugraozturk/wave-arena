import { Simulation } from "./Simulation";
import type { ClassId, InputSnapshot } from "./types";

export interface ReplayFrame {
  ticks: number;
  input: InputSnapshot;
}

export interface ReplayFixture {
  version: 1;
  seed: number;
  maxWaves: number;
  classId: ClassId;
  frames: ReplayFrame[];
  expected?: ReplaySummary;
}

export interface ReplaySummary {
  version: 1;
  seed: number;
  classId: ClassId;
  ticks: number;
  phase: string;
  time: number;
  waveIndex: number;
  level: number;
  kills: number;
  player: { x: number; y: number; hp: number; maxHp: number };
  appliedBoostIds: string[];
  enemies: Array<{ id: number; defId: string; hp: number; x: number; y: number; alive: boolean }>;
  projectiles: Array<{ id: number; damage: number; x: number; y: number; hostile: boolean }>;
  rngState: number;
}

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

export function runReplay(fixture: ReplayFixture): ReplaySummary {
  if (fixture.version !== 1) throw new RangeError("Unsupported replay fixture version: " + fixture.version);
  const simulation = new Simulation({ seed: fixture.seed, maxWaves: fixture.maxWaves });
  simulation.selectClass(fixture.classId);

  let ticks = 0;
  for (const frame of fixture.frames) {
    if (!Number.isInteger(frame.ticks) || frame.ticks < 0) {
      throw new RangeError("Replay frame ticks must be a non-negative integer");
    }
    for (let index = 0; index < frame.ticks; index += 1) {
      simulation.tick(1 / 60, frame.input);
      ticks += 1;
    }
  }

  const state = simulation.state;
  const save = JSON.parse(simulation.saveRun()) as { rngState: number };
  return {
    version: 1,
    seed: simulation.getSeed(),
    classId: fixture.classId,
    ticks,
    phase: state.phase,
    time: rounded(state.time),
    waveIndex: state.waveIndex,
    level: state.level,
    kills: state.kills,
    player: {
      x: rounded(state.player.position.x),
      y: rounded(state.player.position.y),
      hp: rounded(state.player.hp),
      maxHp: rounded(state.player.maxHp),
    },
    appliedBoostIds: [...state.appliedBoostIds],
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      defId: enemy.defId,
      hp: rounded(enemy.hp),
      x: rounded(enemy.position.x),
      y: rounded(enemy.position.y),
      alive: enemy.alive,
    })),
    projectiles: state.projectiles.map((projectile) => ({
      id: projectile.id,
      damage: rounded(projectile.damage),
      x: rounded(projectile.position.x),
      y: rounded(projectile.position.y),
      hostile: projectile.hostile,
    })),
    rngState: save.rngState,
  };
}
