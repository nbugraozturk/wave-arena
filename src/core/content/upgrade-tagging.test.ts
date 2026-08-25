import { describe, it } from "node:test";
import assert from "node:assert";
import { BOOSTS } from "./catalog";

describe("PHASE 1.1: Upgrade Tagging System", () => {
    it("all boosts have tags assigned", () => {
        const missingTags = BOOSTS.filter((b) => !b.tags || b.tags.length === 0);
        assert.strictEqual(
            missingTags.length,
            0,
            `${missingTags.length} boost(s) missing tags: ${missingTags.map((b) => b.id).join(", ")}`
        );
    });

    it("tags are normalized strings", () => {
        const invalidTags = BOOSTS.filter((b) =>
            b.tags?.some((tag) => typeof tag !== "string" || tag.length === 0)
        );
        assert.strictEqual(invalidTags.length, 0, "Found invalid tag entries");
    });

    it("tag categories exist and are consistent", () => {
        const allTags = new Set<string>();
        BOOSTS.forEach((b) => b.tags?.forEach((tag) => allTags.add(tag)));

        const expectedCategories = [
            "damage",
            "defense",
            "control",
            "economy",
            "dot",
            "crit",
            "utility",
        ];
        const foundCategories = Array.from(allTags).sort();

        expectedCategories.forEach((cat) => {
            assert.ok(
                allTags.has(cat),
                `Expected category '${cat}' not found in boosts`
            );
        });

        console.log(`Found ${foundCategories.length} distinct tags: ${foundCategories.join(", ")}`);
    });

    it("each boost has at least one tag", () => {
        BOOSTS.forEach((boost) => {
            assert.ok(
                boost.tags && boost.tags.length > 0,
                `Boost '${boost.id}' has no tags`
            );
        });
    });

    it("tags match boost function", () => {
        // Damage boosters should have "damage" tag
        const damageBoosts = BOOSTS.filter((b) =>
            b.id.includes("damage") || b.id.includes("fire") || b.id.includes("crit")
        );
        damageBoosts.forEach((b) => {
            assert.ok(
                b.tags?.includes("damage") || b.tags?.includes("crit"),
                `Damage boost '${b.id}' missing damage-related tag`
            );
        });

        // Defense boosters should have "defense" tag
        const defenseBoosts = BOOSTS.filter((b) =>
            ["hp", "armor", "dodge", "shield", "lifesteal", "vital"].includes(b.id)
        );
        defenseBoosts.forEach((b) => {
            assert.ok(
                b.tags?.includes("defense"),
                `Defense boost '${b.id}' missing defense tag`
            );
        });

        // Control boosters should have "control" tag
        const controlBoosts = BOOSTS.filter((b) =>
            ["knockback", "frost", "freeze", "stun", "burn_duration", "burn_spread"].includes(b.id)
        );
        controlBoosts.forEach((b) => {
            assert.ok(
                b.tags?.includes("control"),
                `Control boost '${b.id}' missing control tag`
            );
        });

        // Economy boosters should have "economy" tag
        const economyBoosts = BOOSTS.filter((b) =>
            ["xp_gain", "gold_gain", "drop_chance", "reroll"].includes(b.id)
        );
        economyBoosts.forEach((b) => {
            assert.ok(
                b.tags?.includes("economy"),
                `Economy boost '${b.id}' missing economy tag`
            );
        });
    });
});
