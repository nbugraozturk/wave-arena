export const FEATURE_FLAGS = {
    ENABLE_MUTATORS: true,
    ENABLE_DAILY_CHALLENGE: true,
    ENABLE_WEEKLY_CHALLENGE: true,
} as const;

export type MutatorId =
    | "vampire_night"
    | "glass_world"
    | "endless_horde";

export interface MutatorDef {
    id: MutatorId;
    name: string;
    description: string;
    difficulty: "low" | "medium" | "high";
    modifiers: {
        enemyHpMultiplier?: number;
        enemyDamageMultiplier?: number;
        enemySpeedMultiplier?: number;
        enemyCountMultiplier?: number;
        playerHpMultiplier?: number;
        playerDamageMultiplier?: number;
        xpMultiplier?: number;
        lifestealMultiplier?: number;
    };
}

export interface DailyChallengeDef {
    id: string;
    mode: "daily";
    date: string;
    character: string;
    seed: number;
    mutators: MutatorId[];
    difficulty: number;
    rules: string[];
    goal: string;
}

export interface WeeklyChallengeDef extends Omit<DailyChallengeDef, "id" | "mode" | "date" | "goal"> {
    id: string;
    mode: "weekly";
    date: string;
    goal: string;
}

export const MUTATORS: MutatorDef[] = [
    {
        id: "vampire_night",
        name: "Vampire Night",
        description: "Enemy speed +20%, lifesteal effectiveness +100%, vampire artifacts appear more often.",
        difficulty: "medium",
        modifiers: {
            enemySpeedMultiplier: 1.2,
            enemyDamageMultiplier: 1.08,
            lifestealMultiplier: 2,
            xpMultiplier: 1.08,
        },
    },
    {
        id: "glass_world",
        name: "Glass World",
        description: "Player max HP -50%, damage +75%.",
        difficulty: "high",
        modifiers: {
            playerHpMultiplier: 0.5,
            playerDamageMultiplier: 1.75,
        },
    },
    {
        id: "endless_horde",
        name: "Endless Horde",
        description: "Enemy spawn rate +100%, XP gain +150%.",
        difficulty: "high",
        modifiers: {
            enemyCountMultiplier: 2,
            xpMultiplier: 1.5,
        },
    },
];

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function getMutatorById(id: string): MutatorDef | undefined {
    return MUTATORS.find((mutator) => mutator.id === id);
}

export function getMutatorsForDate(dateKey: string): MutatorId[] {
    const safeKey = dateKey.trim() || "fallback-day";
    const seed = hashString(safeKey) >>> 0;
    const bucket = ["vampire_night", "glass_world", "endless_horde"] as const;
    const selected: MutatorId[] = [];
    const indexA = seed % bucket.length;
    const indexB = (seed >> 3) % bucket.length;
    const first = bucket[indexA] ?? "vampire_night";
    const second = bucket[(indexB + indexA + 1) % bucket.length] ?? "glass_world";
    selected.push(first);
    if (first !== second) selected.push(second);
    return selected;
}

export function buildDailyChallenge(dateKey: string, character = "marksman"): DailyChallengeDef {
    const mutators = getMutatorsForDate(dateKey);
    const seed = hashString(`${dateKey}:${character}`) % 900000 + 100000;
    return {
        id: `daily-${dateKey}`,
        mode: "daily",
        date: dateKey,
        character,
        seed,
        mutators,
        difficulty: 1 + (mutators.length * 2),
        rules: ["daily-challenge", "seeded-run", ...mutators.map((mutator) => `mutator:${mutator}`)],
        goal: "Reach Wave 30",
    };
}

export function buildWeeklyChallenge(dateKey: string, character = "vanguard"): WeeklyChallengeDef {
    const weekKey = dateKey.trim() || "fallback-week";
    const mutators = getMutatorsForDate(`week:${weekKey}`);
    const seed = hashString(`weekly:${weekKey}:${character}`) % 900000 + 100000;
    return {
        id: `weekly-${weekKey}`,
        mode: "weekly",
        date: weekKey,
        character,
        seed,
        mutators,
        difficulty: 2 + (mutators.length * 2),
        rules: ["weekly-challenge", "seeded-run", ...mutators.map((mutator) => `mutator:${mutator}`)],
        goal: "Reach Wave 40",
    };
}
