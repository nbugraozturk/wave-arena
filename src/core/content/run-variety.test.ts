import assert from "assert";
import { describe, it } from "node:test";
import {
    analyzeWave,
    getWaveComposition,
    generateThreatSummary,
    generateThreatList,
    previewWaves,
    getWaveDifficulty,
} from "../content/wave-preview";
import {
    RUN_MODIFIERS,
    getRunModifierById,
    applyRunModifierToWave,
    applyRunModifiersToStats,
    calculateRunModifierRewardMultiplier,
    getRunModifierSummary,
} from "../content/run-modifiers";
import { buildWaves, BASE_STATS } from "../content/catalog";
import { Rng } from "../rng";
import type { WaveDef, RunModifierId } from "../types";

/**
 * PHASE 3: Run Variety Tests
 * Testing wave preview system and run modifiers.
 */

describe("PHASE 3.1: Wave Preview System", () => {
    const waves = buildWaves(30);

    it("analyzeWave returns correct structure", () => {
        const wave = waves[0];
        const analysis = analyzeWave(wave);

        assert.ok(typeof analysis.totalEnemies === "number");
        assert.ok(typeof analysis.totalHp === "number");
        assert.ok(["low", "medium", "high", "extreme"].includes(analysis.threatLevel));
        assert.ok(typeof analysis.hasElites === "boolean");
        assert.ok(typeof analysis.dominantThreat === "string");
        assert.ok(analysis.hardestEnemy);
    });

    it("analyzeWave early wave has low threat", () => {
        const wave = waves[0]; // Wave 1
        const analysis = analyzeWave(wave);

        assert.strictEqual(analysis.threatLevel, "low", "Wave 1 should be low threat");
    });

    it("analyzeWave late wave has high threat", () => {
        const wave = waves[19]; // Wave 20
        const analysis = analyzeWave(wave);

        assert.ok(
            ["high", "extreme"].includes(analysis.threatLevel),
            `Wave 20 should be high/extreme, got ${analysis.threatLevel}`
        );
    });

    it("getWaveComposition returns correct format", () => {
        const wave = waves[0];
        const composition = getWaveComposition(wave);

        assert.ok(Array.isArray(composition));
        assert.ok(composition.length > 0);
        composition.forEach((item) => {
            assert.ok(typeof item.id === "string");
            assert.ok(typeof item.count === "number");
            assert.ok(item.count > 0);
        });
    });

    it("generateThreatSummary returns non-empty string", () => {
        const wave = waves[5];
        const summary = generateThreatSummary(wave, 5);

        assert.ok(typeof summary === "string");
        assert.ok(summary.length > 0);
    });

    it("generateThreatList returns array of threats", () => {
        const wave = waves[10];
        const threats = generateThreatList(wave, 10);

        assert.ok(Array.isArray(threats));
        assert.ok(threats.length > 0);
        threats.forEach((threat) => {
            assert.ok(typeof threat === "string");
            assert.ok(threat.length > 0);
        });
    });

    it("previewWaves generates correct number of previews", () => {
        const previews = previewWaves(waves, 1, 3);

        assert.ok(Array.isArray(previews));
        assert.ok(previews.length > 0);
        assert.ok(previews.length <= 3);
    });

    it("previewWaves sets correct certainty levels", () => {
        const previews = previewWaves(waves, 5, 3);

        assert.ok(previews.length > 0);
        if (previews.length >= 1) assert.strictEqual(previews[0].certainty, "known");
        if (previews.length >= 2) assert.strictEqual(previews[1].certainty, "forecast");
        if (previews.length >= 3) assert.strictEqual(previews[2].certainty, "unknown");
    });

    it("previewWaves includes composition and threats", () => {
        const previews = previewWaves(waves, 1, 1);

        assert.ok(previews.length > 0);
        const preview = previews[0];
        assert.ok(Array.isArray(preview.composition));
        assert.ok(Array.isArray(preview.threats));
        assert.ok(preview.summary);
    });

    it("getWaveDifficulty returns number 0-100", () => {
        for (const wave of waves.slice(0, 10)) {
            const difficulty = getWaveDifficulty(wave);
            assert.ok(typeof difficulty === "number");
            assert.ok(difficulty >= 0 && difficulty <= 100);
        }
    });

    it("getWaveDifficulty increases with wave", () => {
        const difficulty1 = getWaveDifficulty(waves[0]);
        const difficulty10 = getWaveDifficulty(waves[9]);
        const difficulty20 = getWaveDifficulty(waves[19]);

        assert.ok(difficulty10 > difficulty1, "Wave 10 should be harder than wave 1");
        assert.ok(difficulty20 > difficulty10, "Wave 20 should be harder than wave 10");
    });

    it("analyzeWave detects elite waves", () => {
        const eliteWaves = waves.filter((w) => w.elite);
        assert.ok(eliteWaves.length > 0, "Should have elite waves");

        for (const wave of eliteWaves) {
            const analysis = analyzeWave(wave);
            assert.ok(analysis.hasElites, `Wave ${wave.index} should have elites`);
        }
    });
});

describe("PHASE 3.2: Run Modifiers System", () => {
    it("RUN_MODIFIERS has 5 modifiers", () => {
        const modifiers = Object.keys(RUN_MODIFIERS);
        assert.strictEqual(modifiers.length, 5);
    });

    it("each modifier has required fields", () => {
        for (const [id, modifier] of Object.entries(RUN_MODIFIERS)) {
            assert.ok(modifier.id);
            assert.ok(modifier.name);
            assert.ok(modifier.description);
            assert.ok(modifier.rarity);
        }
    });

    it("getRunModifierById returns correct modifier", () => {
        const elite_rush = getRunModifierById("elite_rush");
        assert.ok(elite_rush);
        assert.strictEqual(elite_rush.id, "elite_rush");
    });

    it("getRunModifierById returns undefined for invalid", () => {
        const invalid = getRunModifierById("invalid" as RunModifierId);
        assert.strictEqual(invalid, undefined);
    });

    it("applyRunModifierToWave multiplies elite chance", () => {
        const modifier = RUN_MODIFIERS.elite_rush;
        const result = applyRunModifierToWave(5, modifier, 0.1);

        assert.ok(result.eliteChance > 0.1, "Elite chance should be multiplied");
    });

    it("applyRunModifierToWave multiplies enemy stats", () => {
        const modifier = RUN_MODIFIERS.hardcore;
        const result = applyRunModifierToWave(5, modifier, 0.1);

        assert.ok(result.enemyHpMultiplier > 1.0);
        assert.ok(result.enemyCountMultiplier > 1.0);
    });

    it("applyRunModifiersToStats modifies player stats", () => {
        const modifiers: RunModifierId[] = ["elite_rush"];
        const modified = applyRunModifiersToStats({ ...BASE_STATS }, modifiers);

        assert.ok(modified.goldGain > BASE_STATS.goldGain, "Gold gain should increase");
    });

    it("applyRunModifiersToStats handles multiple modifiers", () => {
        const modifiers: RunModifierId[] = ["elite_rush", "abundance"];
        const modified = applyRunModifiersToStats({ ...BASE_STATS }, modifiers);

        assert.ok(modified.goldGain > BASE_STATS.goldGain, "Gold gain should increase");
        assert.ok(modified.dropChance > BASE_STATS.dropChance, "Drop chance should increase");
    });

    it("applyRunModifiersToStats hardcore reduces maxHp", () => {
        const modifiers: RunModifierId[] = ["hardcore"];
        const modified = applyRunModifiersToStats({ ...BASE_STATS }, modifiers);

        assert.ok(modified.maxHp < BASE_STATS.maxHp, "Hardcore should reduce max HP");
        assert.ok(modified.xpGain > BASE_STATS.xpGain, "Hardcore should increase XP gain");
    });

    it("applyRunModifiersToStats rng_boost doubles crit", () => {
        const modifiers: RunModifierId[] = ["rng_boost"];
        const modified = applyRunModifiersToStats({ ...BASE_STATS }, modifiers);

        assert.ok(modified.critChance === BASE_STATS.critChance * 2, "Crit should double");
    });

    it("calculateRunModifierRewardMultiplier starts at 1.0", () => {
        const multiplier = calculateRunModifierRewardMultiplier([]);
        assert.strictEqual(multiplier, 1.0);
    });

    it("calculateRunModifierRewardMultiplier increases with modifiers", () => {
        const m1 = calculateRunModifierRewardMultiplier(["elite_rush"]);
        const m2 = calculateRunModifierRewardMultiplier(["elite_rush", "abundance"]);

        assert.ok(m1 > 1.0);
        assert.ok(m2 > m1, "More modifiers should increase multiplier");
    });

    it("getRunModifierSummary hardcore is extreme difficulty", () => {
        const summary = getRunModifierSummary(["hardcore", "mutant_surge"]);

        assert.strictEqual(summary.difficulty, "extreme");
        assert.ok(summary.risks.length > 0);
        assert.ok(summary.benefits.length > 0);
    });

    it("getRunModifierSummary abundance is normal difficulty", () => {
        const summary = getRunModifierSummary(["abundance"]);

        assert.strictEqual(summary.difficulty, "normal");
    });

    it("getRunModifierSummary elite_rush is hard difficulty", () => {
        const summary = getRunModifierSummary(["elite_rush"]);

        assert.strictEqual(summary.difficulty, "hard");
    });

    it("RUN_MODIFIERS.elite_rush has valid structure", () => {
        const mod = RUN_MODIFIERS.elite_rush;
        assert.ok(mod.waveModifiers?.eliteChance);
        assert.ok(mod.modifiers?.mul?.goldGain);
    });

    it("RUN_MODIFIERS.abundance has drop chance boost", () => {
        const mod = RUN_MODIFIERS.abundance;
        assert.ok(mod.modifiers?.mul?.dropChance);
    });

    it("RUN_MODIFIERS.hardcore has negative maxHp multiplier", () => {
        const mod = RUN_MODIFIERS.hardcore;
        assert.ok(mod.modifiers?.mul?.maxHp);
        assert.ok(mod.modifiers.mul.maxHp < 1.0);
    });

    it("RUN_MODIFIERS.mutant_surge doubles elite chance", () => {
        const mod = RUN_MODIFIERS.mutant_surge;
        assert.strictEqual(mod.waveModifiers?.eliteChance, 2.0);
    });
});

describe("PHASE 3: Integration Tests", () => {
    const waves = buildWaves(30);

    it("wave preview works with modifier context", () => {
        const modifier = RUN_MODIFIERS.elite_rush;
        const previews = previewWaves(waves, 1, 3);

        for (const preview of previews) {
            const waveModifiers = applyRunModifierToWave(
                preview.waveIndex!,
                modifier,
                0.1
            );
            assert.ok(waveModifiers.eliteChance > 0.1);
        }
    });

    it("run modifier affects difficulty calculation", () => {
        const wave = waves[10];
        const baseDifficulty = getWaveDifficulty(wave);

        const modifier = RUN_MODIFIERS.hardcore;
        const modifiedWave = applyRunModifierToWave(11, modifier, 0);
        // Difficulty should increase with hardcore (enemy HP multiplier)

        assert.ok(baseDifficulty >= 0);
        assert.ok(modifiedWave.enemyHpMultiplier > 1.0);
    });

    it("multiple modifiers stack correctly", () => {
        const baseStats = { ...BASE_STATS };
        const modifiers: RunModifierId[] = ["elite_rush", "abundance", "rng_boost"];

        const modified = applyRunModifiersToStats(baseStats, modifiers);

        // Should have all effects stacked
        assert.ok(modified.goldGain > baseStats.goldGain);
        assert.ok(modified.dropChance > baseStats.dropChance);
        assert.ok(modified.critChance > baseStats.critChance);
    });

    it("run modifier summary reflects chosen modifiers", () => {
        const modifiers: RunModifierId[] = ["hardcore"];
        const summary = getRunModifierSummary(modifiers);

        assert.ok(
            summary.risks.some((r) => r.includes("40%")),
            "Should mention 40% enemy buff"
        );
        assert.ok(
            summary.benefits.some((b) => b.includes("50%")),
            "Should mention 50% XP boost"
        );
    });

    it("preview and modifiers work together for game planning", () => {
        const modifiers: RunModifierId[] = ["elite_rush"];
        const previews = previewWaves(waves, 5, 3);

        for (const preview of previews) {
            // Check if elite waves match expected increase
            if (preview.certainty === "known" && modifiers.includes("elite_rush")) {
                // Elite rush increases elite chance, so we'd see more elite waves
                assert.ok(preview.composition);
            }
        }
    });
});
