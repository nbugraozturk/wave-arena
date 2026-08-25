import { BoostDef } from "../types";

export interface SynergyGroup {
    tag: string;
    boosts: BoostDef[];
    count: number;
}

export interface BoostSynergies {
    boostId: string;
    groups: SynergyGroup[];
    score: number;
}

/**
 * Detects synergies based on shared tags among boosts.
 * Returns synergy information for the entire collection.
 */
export function detectSynergies(boosts: BoostDef[]): BoostSynergies[] {
    // Build tag -> boosts mapping
    const tagMap = new Map<string, BoostDef[]>();
    boosts.forEach((boost) => {
        (boost.tags ?? []).forEach((tag) => {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, []);
            }
            tagMap.get(tag)!.push(boost);
        });
    });

    // For each boost, find its synergy groups (tags with 2+ boosts)
    const results: BoostSynergies[] = boosts.map((boost) => {
        const groups: SynergyGroup[] = [];
        const seenTags = new Set<string>();

        (boost.tags ?? []).forEach((tag) => {
            if (!seenTags.has(tag)) {
                seenTags.add(tag);
                const tagBoosts = tagMap.get(tag) ?? [];
                if (tagBoosts.length >= 2) {
                    groups.push({
                        tag,
                        boosts: tagBoosts,
                        count: tagBoosts.length,
                    });
                }
            }
        });

        // Score = sum of synergy group sizes (higher = more synergies)
        const score = groups.reduce((acc, g) => acc + g.count, 0);

        return {
            boostId: boost.id,
            groups,
            score,
        };
    });

    return results;
}

/**
 * Get synergy information for a specific boost.
 */
export function getBoostSynergies(boost: BoostDef, allBoosts: BoostDef[]): BoostSynergies {
    const synergies = detectSynergies(allBoosts);
    const result = synergies.find((s) => s.boostId === boost.id);
    if (!result) {
        return { boostId: boost.id, groups: [], score: 0 };
    }
    return result;
}

/**
 * Check if two boosts synergize (share at least one tag).
 */
export function checkBoostSynergy(boostA: BoostDef, boostB: BoostDef): boolean {
    const tagsA = new Set(boostA.tags ?? []);
    const tagsB = new Set(boostB.tags ?? []);
    for (const tag of tagsA) {
        if (tagsB.has(tag)) {
            return true;
        }
    }
    return false;
}

/**
 * Get all tags that synergize across a collection of boosts.
 */
export function getActiveTags(boosts: BoostDef[]): Map<string, number> {
    const tagCounts = new Map<string, number>();
    boosts.forEach((boost) => {
        (boost.tags ?? []).forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        });
    });
    return tagCounts;
}

/**
 * Get synergy summary for display (tags with 2+ boosts).
 */
export function getSynergySummary(boosts: BoostDef[]): SynergyGroup[] {
    const tagMap = new Map<string, BoostDef[]>();
    boosts.forEach((boost) => {
        (boost.tags ?? []).forEach((tag) => {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, []);
            }
            tagMap.get(tag)!.push(boost);
        });
    });

    const groups: SynergyGroup[] = [];
    for (const [tag, tagBoosts] of tagMap.entries()) {
        if (tagBoosts.length >= 2) {
            groups.push({
                tag,
                boosts: tagBoosts,
                count: tagBoosts.length,
            });
        }
    }

    // Sort by count descending
    return groups.sort((a, b) => b.count - a.count);
}

/**
 * Calculate synergy bonus for a given collection of boosts.
 * Returns a multiplier to apply to stats (1.0 = no bonus).
 * Small bonus: +2% per synergy tag above 2 boosts, capped at +10%.
 */
export function calculateSynergyBonus(boosts: BoostDef[]): number {
    const summary = getSynergySummary(boosts);

    // Each synergy tag with N boosts grants: 0.02 * (N - 1) bonus
    // E.g., 2 boosts = +2%, 3 boosts = +4%, 4 boosts = +6%, etc.
    let totalBonus = 0;
    summary.forEach((group) => {
        const bonus = 0.02 * (group.count - 1);
        totalBonus += bonus;
    });

    // Cap total synergy bonus at 10%
    const cappedBonus = Math.min(totalBonus, 0.1);
    return 1 + cappedBonus;
}

/**
 * Get breakdown of synergy bonuses by tag.
 */
export function getSynergyBonusBreakdown(boosts: BoostDef[]): Record<string, number> {
    const summary = getSynergySummary(boosts);
    const breakdown: Record<string, number> = {};

    summary.forEach((group) => {
        const bonus = 0.02 * (group.count - 1);
        breakdown[group.tag] = bonus;
    });

    return breakdown;
}
