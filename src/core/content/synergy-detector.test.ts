import { describe, it } from "node:test";
import assert from "node:assert";
import { BOOSTS } from "./catalog";
import {
    detectSynergies,
    getBoostSynergies,
    checkBoostSynergy,
    getActiveTags,
    getSynergySummary,
    calculateSynergyBonus,
    getSynergyBonusBreakdown,
} from "./synergy-detector";

describe("PHASE 1.2: Basic Synergy Detector", () => {
    it("detects synergies across all boosts", () => {
        const synergies = detectSynergies(BOOSTS);
        assert.strictEqual(synergies.length, BOOSTS.length, "Should have synergy entry for each boost");
    });

    it("returns non-negative synergy scores", () => {
        const synergies = detectSynergies(BOOSTS);
        synergies.forEach((s) => {
            assert.ok(s.score >= 0, `Boost ${s.boostId} has negative score`);
        });
    });

    it("identifies synergy groups only when 2+ boosts share tag", () => {
        const synergies = detectSynergies(BOOSTS);
        synergies.forEach((s) => {
            s.groups.forEach((g) => {
                assert.ok(g.count >= 2, `Group for tag '${g.tag}' has less than 2 boosts`);
                assert.strictEqual(
                    g.boosts.length,
                    g.count,
                    `Group count mismatch for tag '${g.tag}'`
                );
            });
        });
    });

    it("detects synergies between damage boosts", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage"));
        assert.ok(damageBoosts.length >= 2, "Should have multiple damage boosts");

        const synergyA = getBoostSynergies(damageBoosts[0], BOOSTS);
        assert.ok(
            synergyA.groups.some((g) => g.tag === "damage"),
            "First damage boost should have damage synergy group"
        );
    });

    it("detects synergies between defense boosts", () => {
        const defenseBoosts = BOOSTS.filter((b) => b.tags?.includes("defense"));
        assert.ok(defenseBoosts.length >= 2, "Should have multiple defense boosts");

        const synergyA = getBoostSynergies(defenseBoosts[0], BOOSTS);
        assert.ok(
            synergyA.groups.some((g) => g.tag === "defense"),
            "First defense boost should have defense synergy group"
        );
    });

    it("checkBoostSynergy returns true for boosts with shared tags", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage")).slice(0, 2);
        if (damageBoosts.length === 2) {
            assert.ok(
                checkBoostSynergy(damageBoosts[0], damageBoosts[1]),
                "Damage boosts should synergize"
            );
        }
    });

    it("checkBoostSynergy returns false for boosts without shared tags", () => {
        const damageOnly = BOOSTS.filter(
            (b) => b.tags?.includes("damage") && !b.tags?.includes("defense")
        )[0];
        const defenseOnly = BOOSTS.filter(
            (b) => b.tags?.includes("defense") && !b.tags?.includes("damage")
        )[0];

        if (damageOnly && defenseOnly) {
            assert.strictEqual(
                checkBoostSynergy(damageOnly, defenseOnly),
                false,
                "Damage and defense only boosts should not synergize"
            );
        }
    });

    it("getActiveTags returns correct counts", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage"));
        const activeTags = getActiveTags(damageBoosts);

        assert.ok(activeTags.has("damage"), "Should have damage tag");
        assert.strictEqual(
            activeTags.get("damage"),
            damageBoosts.length,
            "Damage tag count should match boost count"
        );
    });

    it("getSynergySummary only includes tags with 2+ boosts", () => {
        const allSynergies = getSynergySummary(BOOSTS);

        allSynergies.forEach((group) => {
            assert.ok(group.count >= 2, `Synergy group '${group.tag}' has less than 2 boosts`);
        });
    });

    it("getSynergySummary is sorted by count descending", () => {
        const synergies = getSynergySummary(BOOSTS);

        for (let i = 1; i < synergies.length; i++) {
            assert.ok(
                synergies[i - 1].count >= synergies[i].count,
                `Synergies not sorted correctly at index ${i}`
            );
        }
    });

    it("synergy detection finds multiple tags per boost", () => {
        // Find a boost with multiple tags
        const multiTagBoost = BOOSTS.find((b) => (b.tags?.length ?? 0) > 1);
        if (multiTagBoost) {
            const synergy = getBoostSynergies(multiTagBoost, BOOSTS);
            assert.ok(synergy.groups.length >= 1, "Should find at least one synergy group");
        }
    });

    it("synergy score reflects total synergy boost count", () => {
        const synergies = detectSynergies(BOOSTS);
        synergies.forEach((s) => {
            const expectedScore = s.groups.reduce((acc, g) => acc + g.count, 0);
            assert.strictEqual(s.score, expectedScore, `Score mismatch for ${s.boostId}`);
        });
    });

    it("handles boosts with no tags gracefully", () => {
        // Create a test boost with no tags
        const noTagBoost = { ...BOOSTS[0], id: "no-tag-test", tags: [] };
        const synergy = getBoostSynergies(noTagBoost, [noTagBoost, ...BOOSTS]);
        assert.strictEqual(synergy.groups.length, 0, "Boost with no tags should have no synergy groups");
        assert.strictEqual(synergy.score, 0, "Boost with no tags should have score 0");
    });

    it("identifies common synergy themes across run", () => {
        // Check that major categories have multiple boosts
        const summary = getSynergySummary(BOOSTS);
        const majorTags = ["damage", "defense", "control"];

        majorTags.forEach((tag) => {
            const group = summary.find((g) => g.tag === tag);
            assert.ok(group, `Should have synergy group for '${tag}'`);
            assert.ok(group!.count >= 2, `Should have multiple boosts with '${tag}' tag`);
        });
    });
});

describe("PHASE 1.3: Safe Synergy Bonus", () => {
    it("calculateSynergyBonus returns 1.0 for single boost", () => {
        const singleBoost = [BOOSTS[0]];
        const bonus = calculateSynergyBonus(singleBoost);
        assert.strictEqual(bonus, 1.0, "Single boost should have no synergy bonus");
    });

    it("calculateSynergyBonus applies +2% per synergy", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage")).slice(0, 2);
        if (damageBoosts.length === 2) {
            const bonus = calculateSynergyBonus(damageBoosts);
            // 2 damage boosts = +2% synergy
            assert.strictEqual(bonus, 1.02, "Two synergistic boosts should grant +2% bonus");
        }
    });

    it("calculateSynergyBonus scales with synergy count", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage")).slice(0, 3);
        if (damageBoosts.length === 3) {
            const bonus = calculateSynergyBonus(damageBoosts);
            // 3 damage boosts = +4% synergy
            assert.strictEqual(bonus, 1.04, "Three synergistic boosts should grant +4% bonus");
        }
    });

    it("calculateSynergyBonus caps at 10%", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage"));
        if (damageBoosts.length >= 5) {
            const bonus = calculateSynergyBonus(damageBoosts.slice(0, 6));
            // Max cap is 10%
            assert.ok(bonus <= 1.1, "Synergy bonus should not exceed 10%");
            assert.strictEqual(bonus, 1.1, "Six synergistic boosts should cap at +10%");
        }
    });

    it("getSynergyBonusBreakdown shows per-tag bonuses", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage")).slice(0, 2);
        if (damageBoosts.length === 2) {
            const breakdown = getSynergyBonusBreakdown(damageBoosts);
            assert.ok(breakdown["damage"] !== undefined, "Should have damage tag bonus");
            assert.strictEqual(breakdown["damage"], 0.02, "Two damage boosts should grant +2% per damage tag");
        }
    });

    it("calculateSynergyBonus works with multiple tag synergies", () => {
        // Get boosts with different tag combinations
        const mixedBoosts = [
            BOOSTS.find((b) => b.tags?.includes("damage")),
            BOOSTS.find((b) => b.tags?.includes("damage")),
            BOOSTS.find((b) => b.tags?.includes("defense")),
            BOOSTS.find((b) => b.tags?.includes("defense")),
        ].filter((b) => b !== undefined) as typeof BOOSTS;

        if (mixedBoosts.length === 4) {
            const bonus = calculateSynergyBonus(mixedBoosts);
            // Should have +2% for damage and +2% for defense = 1.04
            assert.strictEqual(bonus, 1.04, "Mixed synergies should combine bonuses");
        }
    });

    it("bonus breakdown totals match calculated bonus", () => {
        const damageBoosts = BOOSTS.filter((b) => b.tags?.includes("damage")).slice(0, 3);
        if (damageBoosts.length === 3) {
            const bonus = calculateSynergyBonus(damageBoosts);
            const breakdown = getSynergyBonusBreakdown(damageBoosts);
            const totalFromBreakdown =
                1 + Object.values(breakdown).reduce((a, b) => a + b, 0);
            assert.strictEqual(totalFromBreakdown, bonus, "Breakdown total should match calculated bonus");
        }
    });
});
