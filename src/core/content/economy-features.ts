import type { RunModifierId, EnemyActor } from "../types";
import { calculateRunModifierRewardMultiplier } from "./run-modifiers";

/**
 * PHASE 4.7-9: Economy Features
 * Reward scaling, elite bonuses, and abundance checkpoints.
 */

export function calculateEnemyGoldReward(
    enemy: EnemyActor,
    baseGold: number,
    isElite: boolean,
    runModifiers: RunModifierId[]
): number {
    let gold = baseGold;

    // Elite enemies give more gold
    if (isElite) {
        gold *= 1.5; // 50% bonus for elite
    }

    // Elite rush modifier gives extra gold from elites
    if (runModifiers.includes("elite_rush") && isElite) {
        gold *= 1.5; // Additional 50% bonus with elite_rush
    }

    // Apply run modifier reward multiplier
    const rewardMultiplier = calculateRunModifierRewardMultiplier(runModifiers);
    gold *= rewardMultiplier;

    return Math.ceil(gold);
}

export function calculateEnemyXpReward(
    enemy: EnemyActor,
    baseXp: number,
    isElite: boolean,
    runModifiers: RunModifierId[]
): number {
    let xp = baseXp;

    // Elite enemies give more XP
    if (isElite) {
        xp *= 1.3; // 30% bonus for elite
    }

    // Run modifier reward multiplier applies
    const rewardMultiplier = calculateRunModifierRewardMultiplier(runModifiers);
    xp *= rewardMultiplier;

    return Math.ceil(xp);
}

export function getAbundanceRerollWaveCheckpoint(
    waveIndex: number,
    checkpointInterval: number = 3
): boolean {
    // Abundance grants +1 free reroll every N waves
    return waveIndex > 0 && waveIndex % checkpointInterval === 0;
}

export function applyAbundanceRerollBonus(
    currentRerolls: number,
    waveIndex: number,
    hasAbundanceModifier: boolean
): number {
    if (!hasAbundanceModifier) return currentRerolls;

    if (getAbundanceRerollWaveCheckpoint(waveIndex, 3)) {
        return currentRerolls + 1;
    }

    return currentRerolls;
}

export function getEliteEnemyBonus(
    enemyModifierCount: number
): { goldMultiplier: number; xpMultiplier: number; descriptionkHz: string } {
    // More modifiers = bigger bonus
    const goldMult = 1.0 + enemyModifierCount * 0.25; // +25% per modifier
    const xpMult = 1.0 + enemyModifierCount * 0.15; // +15% per modifier

    let description = "Standard elite";
    if (enemyModifierCount === 1) description = "Elite (+1 modifier)";
    else if (enemyModifierCount === 2) description = "Elite Champion (+2 modifiers)";
    else if (enemyModifierCount >= 3) description = "Elite Legendary (+3+ modifiers)";

    return { goldMultiplier: goldMult, xpMultiplier: xpMult, descriptionkHz: description };
}
