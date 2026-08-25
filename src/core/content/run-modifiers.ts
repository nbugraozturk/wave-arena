import type { RunModifierId, RunModifierDef, BoostModifier, PlayerStats } from "../types";

/**
 * PHASE 3.2 - Run Modifiers System
 * Selectable modifiers that affect the entire run with risk/reward tradeoffs.
 */

export const RUN_MODIFIERS: Record<RunModifierId, RunModifierDef> = {
    elite_rush: {
        id: "elite_rush",
        name: "Elite Rush",
        description: "Bosses spawn more often. +50% gold from elites.",
        rarity: "epic",
        waveModifiers: {
            eliteChance: 1.5, // 50% more elite waves
        },
        modifiers: {
            mul: {
                goldGain: 1.5,
            },
        },
        rewardMultiplier: 1.25,
    },

    abundance: {
        id: "abundance",
        name: "Abundance",
        description: "More pickups and shop items. +30% gold, +1 reroll charge per 3 waves.",
        rarity: "rare",
        modifiers: {
            mul: {
                goldGain: 1.3,
                dropChance: 1.4,
            },
            add: {
                rerollCharges: 0, // Applied per wave in simulation
            },
        },
        rewardMultiplier: 1.1,
    },

    hardcore: {
        id: "hardcore",
        name: "Hardcore",
        description: "Enemies are 40% stronger but grant 50% more XP. Start with 20% less HP.",
        rarity: "legendary",
        waveModifiers: {
            enemyHpMultiplier: 1.4,
            enemyCountMultiplier: 1.15,
        },
        modifiers: {
            mul: {
                xpGain: 1.5,
                maxHp: 0.8, // Start with 80% HP
            },
        },
        rewardMultiplier: 1.5,
    },

    rng_boost: {
        id: "rng_boost",
        name: "RNG Boost",
        description: "Rolls are better but rarer. 2x crit chance, -30% boost offer frequency.",
        rarity: "epic",
        modifiers: {
            mul: {
                critChance: 2.0,
            },
        },
    },

    mutant_surge: {
        id: "mutant_surge",
        name: "Mutant Surge",
        description: "Random enemies gain extra modifiers. +100% elite modifier chance.",
        rarity: "legendary",
        waveModifiers: {
            eliteChance: 2.0, // Double elite chance
        },
    },
};

export function getRunModifierById(id: RunModifierId): RunModifierDef | undefined {
    return RUN_MODIFIERS[id];
}

export function applyRunModifierToWave(
    waveIndex: number,
    modifier: RunModifierDef,
    baseEliteChance: number
): { eliteChance: number; enemyHpMultiplier: number; enemyCountMultiplier: number } {
    const result = {
        eliteChance: baseEliteChance,
        enemyHpMultiplier: 1.0,
        enemyCountMultiplier: 1.0,
    };

    if (modifier.waveModifiers) {
        if (modifier.waveModifiers.eliteChance) {
            result.eliteChance *= modifier.waveModifiers.eliteChance;
        }
        if (modifier.waveModifiers.enemyHpMultiplier) {
            result.enemyHpMultiplier *= modifier.waveModifiers.enemyHpMultiplier;
        }
        if (modifier.waveModifiers.enemyCountMultiplier) {
            result.enemyCountMultiplier *= modifier.waveModifiers.enemyCountMultiplier;
        }
    }

    return result;
}

export function applyRunModifiersToStats(
    baseStats: PlayerStats,
    modifiers: RunModifierId[]
): PlayerStats {
    const stats: PlayerStats = { ...baseStats };

    for (const modifierId of modifiers) {
        const modifier = getRunModifierById(modifierId);
        if (!modifier || !modifier.modifiers) continue;

        const { add, mul } = modifier.modifiers;

        // Apply additive modifiers
        if (add) {
            for (const key of Object.keys(add) as (keyof PlayerStats)[]) {
                const value = add[key];
                if (value !== undefined) stats[key] += value;
            }
        }

        // Apply multiplicative modifiers
        if (mul) {
            for (const key of Object.keys(mul) as (keyof PlayerStats)[]) {
                const value = mul[key];
                if (value !== undefined) stats[key] *= value;
            }
        }
    }

    return stats;
}

export function calculateRunModifierRewardMultiplier(modifiers: RunModifierId[]): number {
    let multiplier = 1.0;

    for (const modifierId of modifiers) {
        const modifier = getRunModifierById(modifierId);
        if (modifier?.rewardMultiplier) {
            multiplier *= modifier.rewardMultiplier;
        }
    }

    return multiplier;
}

export function getRunModifierSummary(modifiers: RunModifierId[]): {
    benefits: string[];
    risks: string[];
    difficulty: "normal" | "hard" | "extreme";
} {
    const benefits: string[] = [];
    const risks: string[] = [];
    let difficultyScore = 0;

    for (const modifierId of modifiers) {
        const modifier = getRunModifierById(modifierId);
        if (!modifier) continue;

        // Extract benefits from description
        if (modifierId === "elite_rush") {
            benefits.push("+50% gold from elites");
            risks.push("More elite waves");
            difficultyScore += 1;
        } else if (modifierId === "abundance") {
            benefits.push("+30% gold, +1 reroll per 3 waves");
            risks.push("More items to manage");
        } else if (modifierId === "hardcore") {
            benefits.push("+50% XP gain");
            risks.push("Enemies 40% stronger, 20% less starting HP");
            difficultyScore += 2;
        } else if (modifierId === "rng_boost") {
            benefits.push("2x crit chance");
            risks.push("Fewer boost offers");
            difficultyScore += 1;
        } else if (modifierId === "mutant_surge") {
            benefits.push("More elite modifier chance");
            risks.push("Harder enemies");
            difficultyScore += 2;
        }
    }

    let difficulty: "normal" | "hard" | "extreme" = "normal";
    if (difficultyScore >= 3) difficulty = "extreme";
    else if (difficultyScore >= 1) difficulty = "hard";

    return { benefits, risks, difficulty };
}
