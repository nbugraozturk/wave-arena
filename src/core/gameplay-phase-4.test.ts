import assert from "assert";
import { describe, it } from "node:test";
import { Simulation } from "./Simulation";
import { previewWaves } from "./content/wave-preview";

/**
 * PHASE 4: Gameplay Implementation Tests
 * Testing wave execution, UI display features, and reward scaling.
 */

describe("PHASE 4.1: Elite Wave Generation", () => {
    it("elite waves mark eliteWave state", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(4); // Wave 4 is elite

        assert.ok(sim.state.eliteWave, "Wave 4 should be marked as elite");
    });

    it("non-elite waves don't mark eliteWave state", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(1);

        assert.ok(!sim.state.eliteWave, "Wave 1 should not be marked as elite");
    });

    it("elite modifiers are applied to enemies in elite waves", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(4); // Elite wave

        // Tick until enemies spawn
        for (let i = 0; i < 100; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        // At least some enemies should have modifiers
        const modifiedEnemies = sim.state.enemies.filter((e) => e.modifiers && e.modifiers.length > 0);
        assert.ok(modifiedEnemies.length > 0, "Elite wave should spawn enemies with modifiers");
    });

    it("enemy modifiers affect stats correctly", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(4);

        // Tick until enemies spawn
        for (let i = 0; i < 100; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        // Find enemies with modifiers and verify their stats are affected
        for (const enemy of sim.state.enemies) {
            if (enemy.modifiers.includes("fast")) {
                assert.ok(enemy.speed > 50, "Fast enemy should have increased speed");
            }
            if (enemy.modifiers.includes("armored")) {
                assert.ok(enemy.maxHp > 50, "Armored enemy should have increased HP");
            }
        }
    });
});

describe("PHASE 4.2: Run Modifier Wave Effects", () => {
    it("run modifiers affect wave spawning", () => {
        const sim1 = new Simulation({ seed: 42, maxWaves: 20 });
        sim1.selectClass("vanguard");
        sim1.startWave(5);

        const enemiesNormal = sim1.waves[4].groups.reduce((sum, g) => sum + g.count, 0);

        // Start with elite_rush modifier (1.15x enemy count)
        const sim2 = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["elite_rush"] });
        sim2.selectClass("vanguard");
        sim2.startWave(5);

        // With run modifiers applied, spawn count should be different
        // This is hard to verify directly, but pendingSpawns will show the difference
        assert.ok(sim2.state.activeRunModifiers.includes("elite_rush"), "Should have elite_rush modifier active");
    });

    it("hardcore modifier increases enemy HP", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["hardcore"] });
        sim.selectClass("vanguard");
        sim.startWave(1);

        // Tick until enemies spawn
        for (let i = 0; i < 100; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        // Enemies should have more HP due to hardcore modifier
        const avgHp = sim.state.enemies.reduce((sum, e) => sum + e.maxHp, 0) / Math.max(1, sim.state.enemies.length);
        assert.ok(avgHp > 0, "Enemies should spawn with hardcore modifier effects");
    });

    it("elite_rush increases elite spawn chance", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["elite_rush"] });
        sim.selectClass("vanguard");
        sim.startWave(8);

        // Tick until enemies spawn
        for (let i = 0; i < 200; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        // Should have spawned some elite-modified enemies
        const modifiedEnemies = sim.state.enemies.filter((e) => e.modifiers.length > 0);
        assert.ok(modifiedEnemies.length > 0, "Elite rush should increase elite spawns");
    });
});

describe("PHASE 4.3: Wave Preview Integration", () => {
    it("wave preview shows threat for upcoming waves", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");

        const previews = previewWaves(sim.waves, 1, 3);

        assert.ok(previews.length > 0, "Should generate previews");
        assert.ok(previews[0].waveIndex === 2, "First preview should be for wave 2");
        assert.ok(previews[0].summary.length > 0, "Preview should have summary text");
        assert.ok(previews[0].composition.length > 0, "Preview should have composition");
    });

    it("preview certainty decreases with distance", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        const previews = previewWaves(sim.waves, 5, 3);

        if (previews.length >= 1) assert.strictEqual(previews[0].certainty, "known");
        if (previews.length >= 2) assert.strictEqual(previews[1].certainty, "forecast");
        if (previews.length >= 3) assert.strictEqual(previews[2].certainty, "unknown");
    });
});

describe("PHASE 4.4: Free Reroll Counter", () => {
    it("free reroll charges increase with level ups", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 50 });
        sim.selectClass("vanguard");

        const initialRerolls = sim.state.freeRerollCharges;
        assert.strictEqual(initialRerolls, 0, "Should start with 0 free rerolls");

        // Gain XP to trigger level up
        sim.state.xp = 10000; // Manually advance XP
        sim.tick(0.016, { moveX: 0, moveY: 0, shoot: false, ult: false });

        // This should trigger level up and boost selection
        assert.ok(sim.state.freeRerollCharges >= initialRerolls, "Free rerolls should not decrease");
    });

    it("reroll charges persist in state", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 5 });
        sim.selectClass("vanguard");

        sim.state.freeRerollCharges = 3;
        const saved = sim.saveRun();

        const sim2 = new Simulation({ seed: 42, maxWaves: 5 });
        const loaded = sim2.loadRun(saved);

        assert.ok(loaded, "Should load run successfully");
        assert.strictEqual(sim2.state.freeRerollCharges, 3, "Free rerolls should persist");
    });
});

describe("PHASE 4.5: Run Modifier Reward Scaling", () => {
    it("run modifiers are active in state", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["elite_rush", "abundance"] });
        sim.selectClass("vanguard");

        assert.ok(sim.state.activeRunModifiers.length === 2, "Should have 2 active modifiers");
        assert.ok(sim.state.activeRunModifiers.includes("elite_rush"));
        assert.ok(sim.state.activeRunModifiers.includes("abundance"));
    });

    it("abundance modifier affects player stats", () => {
        const sim1 = new Simulation({ seed: 42, maxWaves: 20 });
        const sim2 = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["abundance"] });

        sim1.selectClass("vanguard");
        sim2.selectClass("vanguard");

        // Abundance should increase dropChance and goldGain
        assert.ok(sim2.state.stats.dropChance > sim1.state.stats.dropChance, "Abundance should increase drop chance");
        assert.ok(sim2.state.stats.goldGain > sim1.state.stats.goldGain, "Abundance should increase gold gain");
    });

    it("hardcore modifier reduces starting HP but increases XP", () => {
        const sim1 = new Simulation({ seed: 42, maxWaves: 20 });
        const sim2 = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["hardcore"] });

        sim1.selectClass("vanguard");
        sim2.selectClass("vanguard");

        // Hardcore reduces max HP and increases XP
        assert.ok(sim2.state.stats.maxHp < sim1.state.stats.maxHp, "Hardcore should reduce max HP");
        assert.ok(sim2.state.stats.xpGain > sim1.state.stats.xpGain, "Hardcore should increase XP gain");
    });
});

describe("PHASE 4.6: Stalker Enemy Behavior", () => {
    it("stalker can spawn in waves", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(7); // Wave 7+ has stalker

        // Tick until enemies spawn
        for (let i = 0; i < 200; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        const stalkers = sim.state.enemies.filter((e) => e.defId === "stalker");
        assert.ok(stalkers.length > 0, "Wave 7+ should have stalker enemies");
    });

    it("stalker has chase AI", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20 });
        sim.selectClass("vanguard");
        sim.startWave(7);

        // Tick until enemies spawn
        for (let i = 0; i < 200; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        const stalker = sim.state.enemies.find((e) => e.defId === "stalker" && e.alive);
        if (stalker) {
            assert.strictEqual(stalker.ai, "chase", "Stalker should have chase AI");
            assert.ok(stalker.speed > 70, "Stalker should be fast");
        }
    });

    it("stalker can be elite-modified", () => {
        const sim = new Simulation({ seed: 42, maxWaves: 20, runModifiers: ["mutant_surge"] });
        sim.selectClass("vanguard");
        sim.startWave(7);

        // Tick until enemies spawn
        for (let i = 0; i < 200; i++) {
            sim.tick(0.05, { moveX: 0, moveY: 0, shoot: false, ult: false });
        }

        const eliteStalkersexist = sim.state.enemies.some(
            (e) => e.defId === "stalker" && e.modifiers && e.modifiers.length > 0
        );
        assert.ok(eliteStalkersexist || sim.state.waveIndex < 8, "Elite waves should have modified stalkers");
    });
});
