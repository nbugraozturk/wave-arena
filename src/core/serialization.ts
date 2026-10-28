import { ACHIEVEMENTS } from "./content/achievements";
import { CLASSES } from "./content/classes";
import { MAX_MASTERY_XP, UNLOCKS } from "./content/unlocks";
import type { GameState, ProfileState } from "./types";

export interface RunSavePayload {
  version: 2;
  state: GameState;
  rngState: number;
  contactTimer: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wholeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function serializeProfile(profile: ProfileState): string {
  return JSON.stringify(profile);
}

export function parseProfile(serialized: string): ProfileState | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.unlockedClasses)) return null;

    return {
      version: 1,
      legacyShards: wholeNumber(value.legacyShards),
      runsCompleted: wholeNumber(value.runsCompleted),
      bestWave: wholeNumber(value.bestWave),
      unlockedClasses: value.unlockedClasses.filter(
        (id): id is ProfileState["unlockedClasses"][number] =>
          typeof id === "string" && CLASSES.some((cls) => cls.id === id),
      ),
      achievements: Array.isArray(value.achievements)
        ? value.achievements.filter(
            (id): id is string => typeof id === "string" && ACHIEVEMENTS.some((achievement) => achievement.id === id),
          )
        : [],
      masteryXp: Math.min(MAX_MASTERY_XP, wholeNumber(value.masteryXp)),
      unlockedBoosts: Array.isArray(value.unlockedBoosts)
        ? value.unlockedBoosts.filter(
            (id): id is string => typeof id === "string" && UNLOCKS.some((unlock) => unlock.id === id && unlock.kind === "boost"),
          )
        : [],
      unlockedEnemyVariants: Array.isArray(value.unlockedEnemyVariants)
        ? value.unlockedEnemyVariants.filter(
            (id): id is string => typeof id === "string" && UNLOCKS.some((unlock) => unlock.id === id && unlock.kind === "enemy_variant"),
          )
        : [],
    };
  } catch {
    return null;
  }
}

export function serializeRun(state: GameState, rngState: number, contactTimer: number): string {
  return JSON.stringify({ version: 2, state, rngState, contactTimer } satisfies RunSavePayload);
}

export function parseRun(serialized: string): RunSavePayload | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || !isRecord(value.state)) return null;
    if (typeof value.state.phase !== "string" || !Array.isArray(value.state.appliedBoostIds) || !isRecord(value.state.player)) return null;
    if (!isRecord(value.state.player.position) || !isRecord(value.state.player.facing) || !isRecord(value.state.stats)) return null;
    if (!Number.isFinite(value.state.player.position.x) || !Number.isFinite(value.state.player.position.y)) return null;
    if (!Number.isFinite(value.state.player.facing.x) || !Number.isFinite(value.state.player.facing.y)) return null;
    if (!Array.isArray(value.state.enemies) || !Array.isArray(value.state.projectiles) || !Array.isArray(value.state.particles)) return null;
    if (!Array.isArray(value.state.pendingSpawns) || !Array.isArray(value.state.pickups) || !Array.isArray(value.state.zones) || !Array.isArray(value.state.beams)) return null;
    if (typeof value.rngState !== "number" || !Number.isFinite(value.rngState)) return null;

    const state = value.state as unknown as GameState;
    const level = Number(state.level ?? 1);
    const pendingLevelUps = Number(state.pendingLevelUps ?? 0);
    const xp = Number(state.xp ?? 0);
    state.level = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
    state.pendingLevelUps = Number.isFinite(pendingLevelUps) ? Math.max(0, Math.floor(pendingLevelUps)) : 0;
    state.xp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
    state.mutators = Array.isArray(state.mutators) ? state.mutators : [];
    state.challengeMode = state.challengeMode ?? "normal";
    state.challenge = state.challenge ?? null;
    state.activeRunModifiers = Array.isArray(state.activeRunModifiers) ? state.activeRunModifiers : [];
    state.activeAscensionLevel = state.activeAscensionLevel === 1 ? 1 : 0;
    state.freeRerollCharges = wholeNumber(state.freeRerollCharges);

    return {
      version: 2,
      state,
      rngState: value.rngState,
      contactTimer: typeof value.contactTimer === "number" && Number.isFinite(value.contactTimer) ? Math.max(0, value.contactTimer) : 0,
    };
  } catch {
    return null;
  }
}
