import type { EnemyActor, EnemyModifierId } from "../types";
import { RUN_MODIFIERS } from "./run-modifiers";
import { BOOSTS } from "./catalog";

/**
 * PHASE 4.10-12: Combat Polish Features
 * Visual enhancements, synergy hints, and difficulty scaling.
 */

export function getEliteEnemyVisuals(
    baseColor: string,
    modifiers: EnemyModifierId[],
    modifierCount: number
): { color: string; glow: string; scale: number } {
    // Apply visual changes based on elite modifier count
    let color = baseColor;
    let glow = "";
    let scale = 1.0;

    if (modifierCount >= 3) {
        // Legendary: Golden with strong glow
        glow = "gold";
        scale = 1.15;
    } else if (modifierCount === 2) {
        // Champion: Purple with glow
        glow = "purple";
        scale = 1.1;
    } else if (modifierCount === 1) {
        // Elite: Silver with subtle glow
        glow = "silver";
        scale = 1.05;
    }

    // Apply modifier-specific visual overrides
    if (modifiers.includes("armored")) {
        color = "#a0a0a0"; // Metallic gray
    }
    if (modifiers.includes("explosive")) {
        color = "#ff6b6b"; // Bright red
    }
    if (modifiers.includes("shielded")) {
        glow = glow || "cyan";
    }
    if (modifiers.includes("reflective")) {
        glow = glow || "silver";
    }

    return { color, glow, scale };
}

export interface ModifierSynergyHint {
    modifier: EnemyModifierId;
    conflictsWith: EnemyModifierId[];
    description: string;
}

export const MODIFIER_SYNERGIES: Record<EnemyModifierId, ModifierSynergyHint> = {
    regenerating: {
        modifier: "regenerating",
        conflictsWith: [],
        description: "Heals HP each second; combine with tanky modifiers",
    },
    fast: {
        modifier: "fast",
        conflictsWith: [],
        description: "High speed; pairs well with ranged for hit-and-run",
    },
    explosive: {
        modifier: "explosive",
        conflictsWith: [],
        description: "Explodes on death; spawns in groups for chain damage",
    },
    armored: {
        modifier: "armored",
        conflictsWith: [],
        description: "Extra HP; synergizes with regenerating for survivability",
    },
    vampiric: {
        modifier: "vampiric",
        conflictsWith: [],
        description: "Heals when attacking; dangerous close to player",
    },
    swarming: {
        modifier: "swarming",
        conflictsWith: [],
        description: "Splits on death; creates more enemies",
    },
    shielded: {
        modifier: "shielded",
        conflictsWith: [],
        description: "Absorbs damage; focus fire to break shield",
    },
    reflective: {
        modifier: "reflective",
        conflictsWith: [],
        description: "Bounces damage back; requires high burst or safety",
    },
    ranged: {
        modifier: "ranged",
        conflictsWith: [],
        description: "Shoots at player; engage quickly or use cover",
    },
};

export function getSynergyHintsForRun(
    appliedBoostIds: string[],
    activeModifiers: EnemyModifierId[]
): string[] {
    const hints: string[] = [];

    // Check if any enemy modifiers counter player strategy
    for (const modId of activeModifiers) {
        const synergy = MODIFIER_SYNERGIES[modId];
        if (!synergy) continue;

        // Simple hint system: suggest counter-strategies
        if (modId === "armored" || modId === "regenerating") {
            hints.push("Tanky enemies incoming: high DPS boosts recommended");
        }
        if (modId === "fast" || modId === "explosive") {
            hints.push("Fast/explosive enemies: control or pierce recommended");
        }
        if (modId === "ranged" || modId === "reflective") {
            hints.push("Long-range threat: dodge or movement boosts recommended");
        }
    }

    return hints;
}

export function getEnemyDifficultyModifier(
    totalWaveDifficulty: number
): {
    spawnInterval: number;
    spawnCount: number;
    description: string;
} {
    // Scale spawn parameters based on overall difficulty
    let spawnInterval = 0.2; // Default
    let spawnCount = 1.0; // Multiplier
    let description = "Standard";

    if (totalWaveDifficulty > 80) {
        spawnInterval = Math.max(0.08, 0.2 - totalWaveDifficulty / 1000);
        spawnCount = 1.3;
        description = "Extreme";
    } else if (totalWaveDifficulty > 60) {
        spawnInterval = Math.max(0.12, 0.2 - totalWaveDifficulty / 500);
        spawnCount = 1.15;
        description = "Hard";
    } else if (totalWaveDifficulty > 40) {
        spawnInterval = Math.max(0.16, 0.2 - totalWaveDifficulty / 500);
        spawnCount = 1.0;
        description = "Medium";
    }

    return { spawnInterval, spawnCount, description };
}

export function getBoostSynergyWithEnemies(
    boost: typeof BOOSTS[0],
    enemyModifiers: EnemyModifierId[]
): { synergy: number; reasoning: string } {
    let synergy = 1.0; // 1.0 = neutral
    const reasons: string[] = [];

    // Damage boosts counter armored/regenerating
    if (boost.id && boost.id.includes("damage")) {
        if (enemyModifiers.includes("armored")) {
            synergy += 0.15;
            reasons.push("Great against armored enemies");
        }
        if (enemyModifiers.includes("regenerating")) {
            synergy += 0.1;
            reasons.push("Overcomes regeneration");
        }
    }

    // Speed/dodge boosts counter fast/explosive
    if (boost.id && (boost.id.includes("speed") || boost.id.includes("dodge"))) {
        if (enemyModifiers.includes("fast")) {
            synergy += 0.15;
            reasons.push("Keeps up with fast enemies");
        }
        if (enemyModifiers.includes("explosive")) {
            synergy += 0.1;
            reasons.push("Escape blast radius");
        }
    }

    // Defensive boosts counter ranged/reflective
    if (boost.id && (boost.id.includes("armor") || boost.id.includes("shield"))) {
        if (enemyModifiers.includes("ranged")) {
            synergy += 0.15;
            reasons.push("Protection from ranged attacks");
        }
        if (enemyModifiers.includes("reflective")) {
            synergy += 0.2;
            reasons.push("Reduces reflection damage");
        }
    }

    // Control boosts counter swarmers
    if (boost.id && (boost.id.includes("slow") || boost.id.includes("knockback"))) {
        if (enemyModifiers.includes("swarming")) {
            synergy += 0.15;
            reasons.push("Slows spawning waves");
        }
    }

    return {
        synergy,
        reasoning: reasons.length > 0 ? reasons.join("; ") : "Standard effectiveness",
    };
}
