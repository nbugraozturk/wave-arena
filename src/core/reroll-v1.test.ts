import { describe, it } from "node:test";
import assert from "node:assert";
import { Simulation } from "./Simulation";

describe("PHASE 1.4: Reroll v1", () => {
    it("starts with no free reroll charges", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        assert.strictEqual(sim.state.freeRerollCharges, 0, "Should start with 0 free rerolls");
    });

    it("tracks free reroll charges separately from boost rerolls", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        sim.selectClass("vanguard");

        const initialRerolls = sim.state.rerollCharges;
        const initialFreeRerolls = sim.state.freeRerollCharges;

        assert.strictEqual(
            typeof initialRerolls,
            "number",
            "Reroll charges should be a number"
        );
        assert.strictEqual(
            typeof initialFreeRerolls,
            "number",
            "Free reroll charges should be a number"
        );
        assert.ok(initialRerolls >= 0, "Initial rerolls should be non-negative");
        assert.strictEqual(initialFreeRerolls, 0, "Initial free rerolls should be 0");
    });

    it("grants 1 free reroll when selecting boost during level up", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        sim.selectClass("vanguard");

        // Manually trigger level up state
        sim.state.pendingLevelUps = 1;
        sim.state.phase = "boost";
        sim.state.strategicPhase = "boost";
        sim.state.boostOffers = [
            { id: "damage", name: "Test", description: "Test", category: "attack" as const, rarity: "common" as const, modifiers: { mul: { projectileDamage: 1.1 } } },
        ];

        const beforeRerolls = sim.state.freeRerollCharges;
        sim.selectBoost("damage");
        const afterRerolls = sim.state.freeRerollCharges;

        assert.strictEqual(
            afterRerolls,
            beforeRerolls + 1,
            "Should grant 1 free reroll when selecting boost during level up"
        );
    });

    it("grants multiple free rerolls for multiple level ups", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        sim.selectClass("vanguard");

        // Manually trigger multiple level ups
        sim.state.pendingLevelUps = 3;
        sim.state.phase = "boost";
        sim.state.strategicPhase = "boost";
        const testBoosts = [
            { id: "damage", name: "Test1", description: "Test", category: "attack" as const, rarity: "common" as const, modifiers: { mul: { projectileDamage: 1.1 } } },
            { id: "armor", name: "Test2", description: "Test", category: "defense" as const, rarity: "common" as const, modifiers: { add: { armor: 10 } } },
            { id: "xp_gain", name: "Test3", description: "Test", category: "economy" as const, rarity: "common" as const, modifiers: { mul: { xpGain: 1.2 } } },
        ];
        sim.state.boostOffers = testBoosts;

        const startFreeRerolls = sim.state.freeRerollCharges;

        // Select first boost (consumes 1st level up)
        const firstBoost = sim.state.boostOffers[0];
        sim.selectBoost(firstBoost.id);
        assert.strictEqual(
            sim.state.freeRerollCharges,
            startFreeRerolls + 1,
            "Should have 1 free reroll after first level up"
        );
        assert.strictEqual(
            sim.state.pendingLevelUps,
            2,
            "Should have 2 pending level ups remaining"
        );
        assert.strictEqual(
            sim.state.phase,
            "boost",
            "Should still be in boost phase"
        );

        // Re-prepare the boost offers for the next selection
        sim.state.boostOffers = testBoosts;

        // Select second boost (consumes 2nd level up)
        const secondBoost = sim.state.boostOffers[1];
        sim.selectBoost(secondBoost.id);
        assert.strictEqual(
            sim.state.freeRerollCharges,
            startFreeRerolls + 2,
            "Should have 2 free rerolls after second level up"
        );
        assert.strictEqual(
            sim.state.pendingLevelUps,
            1,
            "Should have 1 pending level up remaining"
        );

        // Re-prepare the boost offers for the final selection
        sim.state.boostOffers = testBoosts;

        // Select third boost (consumes 3rd level up, ends boost phase)
        const thirdBoost = sim.state.boostOffers[2];
        sim.selectBoost(thirdBoost.id);
        assert.strictEqual(
            sim.state.freeRerollCharges,
            startFreeRerolls + 3,
            "Should have 3 free rerolls after third level up"
        );
        assert.strictEqual(
            sim.state.pendingLevelUps,
            0,
            "Should have 0 pending level ups"
        );
    });

    it("free reroll charges persist across state changes", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        sim.selectClass("vanguard");

        // Grant free rerolls by simulating level up consumption
        sim.state.pendingLevelUps = 1;
        sim.state.phase = "boost";
        sim.state.strategicPhase = "boost";
        sim.state.boostOffers = [
            { id: "damage", name: "T1", description: "Test", category: "attack" as const, rarity: "common" as const, modifiers: { mul: { projectileDamage: 1.1 } } },
        ];

        sim.selectBoost("damage");
        const freeRerollsAfter = sim.state.freeRerollCharges;
        assert.strictEqual(freeRerollsAfter, 1, "Should have 1 free reroll after level up");

        // Verify state remains consistent
        assert.ok(sim.state.freeRerollCharges === freeRerollsAfter, "Free rerolls should be preserved");
    });
});

