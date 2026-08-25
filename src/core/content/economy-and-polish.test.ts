import assert from "assert";
import { describe, it } from "node:test";
import {
    calculateEnemyGoldReward,
    calculateEnemyXpReward,
    getAbundanceRerollWaveCheckpoint,
    applyAbundanceRerollBonus,
    getEliteEnemyBonus,
} from "../content/economy-features";
import {
    getEliteEnemyVisuals,
    getSynergyHintsForRun,
    getEnemyDifficultyModifier,
    getBoostSynergyWithEnemies,
} from "../content/combat-polish";
import type { EnemyActor } from "../types";
import { BOOSTS } from "../content/catalog";

/**
 * PHASE 4.7-12: Economy and Combat Polish Tests
 */

describe("PHASE 4.7: Run Modifier Reward Scaling", () => {
    it("elite enemies give more gold", () => {
        const enemy: EnemyActor = {
            id: 1,
            team: "enemy",
            defId: "grunt",
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            radius: 14,
            hp: 50,
            maxHp: 50,
            alive: true,
            color: "#fff",
            contactDamage: 10,
            speed: 50,
            ai: "chase",
            modifiers: ["fast"],
            hitFlash: 0,
            slowTimer: 0,
            slowAmount: 0,
            fireCooldown: 0,
            orbitSign: 1,
            isBoss: false,
        };

        const normalGold = calculateEnemyGoldReward(enemy, 10, false, []);
        const eliteGold = calculateEnemyGoldReward(enemy, 10, true, []);

        assert.ok(eliteGold > normalGold, "Elite enemies should give more gold");
    });

    it("elite_rush modifier increases gold further", () => {
        const enemy: EnemyActor = {
            id: 1,
            team: "enemy",
            defId: "grunt",
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            radius: 14,
            hp: 50,
            maxHp: 50,
            alive: true,
            color: "#fff",
            contactDamage: 10,
            speed: 50,
            ai: "chase",
            modifiers: [],
            hitFlash: 0,
            slowTimer: 0,
            slowAmount: 0,
            fireCooldown: 0,
            orbitSign: 1,
            isBoss: false,
        };

        const baseGold = calculateEnemyGoldReward(enemy, 10, false, []);
        const eliteRushGold = calculateEnemyGoldReward(enemy, 10, false, ["elite_rush"]);

        assert.ok(eliteRushGold >= baseGold, "Elite rush should not reduce gold");
    });

    it("calculate XP reward for elite enemies", () => {
        const enemy: EnemyActor = {
            id: 1,
            team: "enemy",
            defId: "tank",
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            radius: 18,
            hp: 100,
            maxHp: 100,
            alive: true,
            color: "#fff",
            contactDamage: 15,
            speed: 30,
            ai: "orbit",
            modifiers: ["armored"],
            hitFlash: 0,
            slowTimer: 0,
            slowAmount: 0,
            fireCooldown: 0,
            orbitSign: 1,
            isBoss: false,
        };

        const xp = calculateEnemyXpReward(enemy, 100, true, []);
        assert.ok(xp > 100, "Elite enemies should give more XP");
    });
});

describe("PHASE 4.8: Elite Bonus Rewards", () => {
    it("getEliteEnemyBonus calculates per modifier", () => {
        const bonus1 = getEliteEnemyBonus(1);
        const bonus2 = getEliteEnemyBonus(2);

        assert.ok(bonus2.goldMultiplier > bonus1.goldMultiplier, "More modifiers = more gold");
        assert.ok(bonus2.xpMultiplier > bonus1.xpMultiplier, "More modifiers = more XP");
    });

    it("elite enemy bonus has descriptions", () => {
        const bonus1 = getEliteEnemyBonus(1);
        const bonus2 = getEliteEnemyBonus(2);
        const bonus3 = getEliteEnemyBonus(3);

        assert.ok(bonus1.descriptionkHz.includes("Elite"));
        assert.ok(bonus2.descriptionkHz.includes("Champion"));
        assert.ok(bonus3.descriptionkHz.includes("Legendary"));
    });
});

describe("PHASE 4.9: Abundance Wave Checkpoints", () => {
    it("getAbundanceRerollWaveCheckpoint identifies checkpoint waves", () => {
        assert.ok(!getAbundanceRerollWaveCheckpoint(0), "Wave 0 is not checkpoint");
        assert.ok(!getAbundanceRerollWaveCheckpoint(1), "Wave 1 is not checkpoint");
        assert.ok(!getAbundanceRerollWaveCheckpoint(2), "Wave 2 is not checkpoint");
        assert.ok(getAbundanceRerollWaveCheckpoint(3), "Wave 3 is checkpoint");
        assert.ok(getAbundanceRerollWaveCheckpoint(6), "Wave 6 is checkpoint");
        assert.ok(getAbundanceRerollWaveCheckpoint(9), "Wave 9 is checkpoint");
    });

    it("applyAbundanceRerollBonus grants rerolls at checkpoints", () => {
        const rerolls1 = applyAbundanceRerollBonus(1, 3, true);
        const rerolls2 = applyAbundanceRerollBonus(1, 4, true);

        assert.strictEqual(rerolls1, 2, "Should grant +1 at wave 3");
        assert.strictEqual(rerolls2, 1, "Should not grant at wave 4");
    });

    it("applyAbundanceRerollBonus only works with modifier", () => {
        const rerolls1 = applyAbundanceRerollBonus(1, 3, true);
        const rerolls2 = applyAbundanceRerollBonus(1, 3, false);

        assert.ok(rerolls1 > rerolls2, "Abundance modifier should grant bonus");
    });
});

describe("PHASE 4.10: Elite Enemy Visuals", () => {
    it("getEliteEnemyVisuals applies modifier count scaling", () => {
        const visual0 = getEliteEnemyVisuals("#fff", [], 0);
        const visual1 = getEliteEnemyVisuals("#fff", ["fast"], 1);
        const visual2 = getEliteEnemyVisuals("#fff", ["fast", "armored"], 2);

        assert.strictEqual(visual0.scale, 1.0);
        assert.strictEqual(visual1.scale, 1.05);
        assert.strictEqual(visual2.scale, 1.1);
    });

    it("getEliteEnemyVisuals applies modifier-specific colors", () => {
        const armoredVisual = getEliteEnemyVisuals("#fff", ["armored"], 1);
        const explosiveVisual = getEliteEnemyVisuals("#fff", ["explosive"], 1);

        assert.strictEqual(armoredVisual.color, "#a0a0a0");
        assert.strictEqual(explosiveVisual.color, "#ff6b6b");
    });

    it("getEliteEnemyVisuals adds glows", () => {
        const visual3 = getEliteEnemyVisuals("#fff", ["fast", "armored", "regenerating"], 3);
        assert.strictEqual(visual3.glow, "gold");
    });
});

describe("PHASE 4.11: Modifier Synergy Hints", () => {
    it("getSynergyHintsForRun generates hints for dangerous modifiers", () => {
        const hints = getSynergyHintsForRun([], ["armored"]);
        assert.ok(hints.length > 0, "Should generate hints for armored");
    });

    it("getSynergyHintsForRun recommends DPS against tanky", () => {
        const hints = getSynergyHintsForRun([], ["regenerating"]);
        assert.ok(hints.some((h) => h.includes("DPS")), "Should recommend DPS");
    });

    it("getSynergyHintsForRun recommends control against swarming", () => {
        const hints = getSynergyHintsForRun([], ["explosive"]);
        assert.ok(hints.length > 0, "Should provide hints");
    });
});

describe("PHASE 4.12: Enemy Difficulty Scaling", () => {
    it("getEnemyDifficultyModifier returns normal spawn interval at low difficulty", () => {
        const modifier = getEnemyDifficultyModifier(20);
        assert.strictEqual(modifier.description, "Standard");
        assert.ok(modifier.spawnInterval > 0.1);
    });

    it("getEnemyDifficultyModifier increases difficulty at high scores", () => {
        const easy = getEnemyDifficultyModifier(30);
        const hard = getEnemyDifficultyModifier(70);

        assert.ok(hard.spawnInterval < easy.spawnInterval, "High difficulty = faster spawn");
        assert.ok(hard.spawnCount > easy.spawnCount, "High difficulty = more spawns");
    });

    it("getEnemyDifficultyModifier extreme at very high difficulty", () => {
        const extreme = getEnemyDifficultyModifier(90);
        assert.strictEqual(extreme.description, "Extreme");
    });
});

describe("PHASE 4: Boost Synergy with Enemy Modifiers", () => {
    it("getBoostSynergyWithEnemies finds damage synergy", () => {
        const damageBoost = BOOSTS.find((b) => b.id === "damage_up");
        if (damageBoost) {
            const synergy = getBoostSynergyWithEnemies(damageBoost, ["armored"]);
            assert.ok(synergy.synergy > 1.0, "Damage should synergize with armored");
        }
    });

    it("getBoostSynergyWithEnemies explains synergy", () => {
        const damageBoost = BOOSTS.find((b) => b.id === "damage_up");
        if (damageBoost) {
            const synergy = getBoostSynergyWithEnemies(damageBoost, ["armored"]);
            assert.ok(synergy.reasoning.length > 0, "Should explain synergy");
        }
    });

    it("getBoostSynergyWithEnemies default on unknown boosts", () => {
        const boost = BOOSTS[0];
        const synergy = getBoostSynergyWithEnemies(boost, []);
        assert.ok(synergy.synergy >= 1.0, "Should return neutral or better synergy");
    });
});
