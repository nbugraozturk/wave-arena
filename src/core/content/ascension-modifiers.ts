import type { AscensionLevel, PlayerStats } from "../types";

export const ASCENSION_1_UNLOCK_WAVE = 8;

export const ASCENSION_1 = {
    level: 1 as const,
    name: "Ascension 1",
    description: "Düşmanlar güçlenir, karşılığında daha fazla XP kazanırsın.",
    effects: ["Düşman canı +25%", "Düşman sayısı +10%", "XP kazancı +25%"],
    waveModifiers: { enemyHpMultiplier: 1.25, enemyCountMultiplier: 1.1 },
    statMultipliers: { xpGain: 1.25 },
};

export function isAscensionUnlocked(bestWave: number): boolean {
    return Number.isFinite(bestWave) && bestWave >= ASCENSION_1_UNLOCK_WAVE;
}

export function getUnlockedAscensionLevels(bestWave: number): AscensionLevel[] {
    return isAscensionUnlocked(bestWave) ? [0, 1] : [0];
}

export function applyAscensionStats(stats: PlayerStats, level: AscensionLevel): PlayerStats {
    if (level !== 1) return { ...stats };
    return { ...stats, xpGain: stats.xpGain * ASCENSION_1.statMultipliers.xpGain };
}

export function applyAscensionToWave(level: AscensionLevel): { enemyHpMultiplier: number; enemyCountMultiplier: number } {
    return level === 1 ? { ...ASCENSION_1.waveModifiers } : { enemyHpMultiplier: 1, enemyCountMultiplier: 1 };
}