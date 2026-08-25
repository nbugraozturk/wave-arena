import type { ProfileState, UnlockDef } from "../types";

export const MAX_MASTERY_XP = 100;

export const UNLOCKS: UnlockDef[] = [
    {
        id: "bouncing_rounds",
        name: "Bouncing Rounds",
        description: "+1 projectile ricochet",
        kind: "boost",
        masteryXp: 20,
    },
    {
        id: "overcharged_core",
        name: "Overcharged Core",
        description: "+1 projectile per volley",
        kind: "boost",
        masteryXp: 60,
    },
];

export function getUnlockById(id: string): UnlockDef | undefined {
    return UNLOCKS.find((unlock) => unlock.id === id);
}

export function isUnlockEligible(unlock: UnlockDef, profile: Pick<ProfileState, "masteryXp">): boolean {
    return (profile.masteryXp ?? 0) >= unlock.masteryXp;
}

export function getUnlockedContentIds(
    profile: Pick<ProfileState, "masteryXp" | "unlockedBoosts" | "unlockedEnemyVariants">,
): string[] {
    const persisted = [...(profile.unlockedBoosts ?? []), ...(profile.unlockedEnemyVariants ?? [])];
    const eligible = UNLOCKS.filter((unlock) => isUnlockEligible(unlock, profile)).map((unlock) => unlock.id);
    return [...new Set([...persisted, ...eligible])];
}

export function calculateMasteryXpGain(waveIndex: number, victory: boolean): number {
    const safeWave = Number.isFinite(waveIndex) ? Math.max(0, Math.floor(waveIndex)) : 0;
    return 2 + Math.min(8, Math.floor(safeWave / 2)) + (victory ? 2 : 0);
}

export function addMasteryXp(currentXp: number, amount: number): number {
    const safeCurrent = Number.isFinite(currentXp) ? Math.max(0, currentXp) : 0;
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    return Math.min(MAX_MASTERY_XP, Math.floor(safeCurrent + safeAmount));
}