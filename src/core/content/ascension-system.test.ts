import test from "node:test";
import assert from "node:assert/strict";

import { Simulation } from "../Simulation";
import { BASE_STATS } from "./catalog";
import { applyAscensionStats, applyAscensionToWave, getUnlockedAscensionLevels, isAscensionUnlocked } from "./ascension-modifiers";

test("Ascension 1 unlocks after reaching wave 8", () => {
    assert.equal(isAscensionUnlocked(7), false);
    assert.equal(isAscensionUnlocked(8), true);
    assert.deepEqual(getUnlockedAscensionLevels(7), [0]);
    assert.deepEqual(getUnlockedAscensionLevels(8), [0, 1]);
});

test("Ascension 1 applies transparent XP and wave modifiers", () => {
    const stats = applyAscensionStats(BASE_STATS, 1);
    const wave = applyAscensionToWave(1);
    assert.equal(stats.xpGain, BASE_STATS.xpGain * 1.25);
    assert.deepEqual(wave, { enemyHpMultiplier: 1.25, enemyCountMultiplier: 1.1 });
});

test("normal runs do not receive Ascension effects", () => {
    assert.deepEqual(applyAscensionStats(BASE_STATS, 0), BASE_STATS);
    assert.deepEqual(applyAscensionToWave(0), { enemyHpMultiplier: 1, enemyCountMultiplier: 1 });
    const simulation = new Simulation({ seed: 1, maxWaves: 8 });
    assert.equal(simulation.state.activeAscensionLevel, 0);
});

test("Ascension configuration is persisted in run saves", () => {
    const source = new Simulation({ seed: 2, maxWaves: 8, ascensionLevel: 1 });
    const restored = new Simulation({ seed: 3, maxWaves: 8 });
    source.selectClass("vanguard");
    assert.equal(restored.loadRun(source.saveRun()), true);
    assert.equal(restored.state.activeAscensionLevel, 1);
});

test("Ascension 1 affects the live simulation after class selection", () => {
    const normal = new Simulation({ seed: 4, maxWaves: 8 });
    const ascended = new Simulation({ seed: 4, maxWaves: 8, ascensionLevel: 1 });
    normal.selectClass("vanguard");
    ascended.selectClass("vanguard");

    assert.equal(ascended.state.stats.xpGain, normal.state.stats.xpGain * 1.25);
    const ascendedSpawn = ascended.state.pendingSpawns.find((spawn) => spawn.defId === "grunt");
    assert.equal(ascendedSpawn?.hpMultiplier, 1.25);
    assert.equal(ascended.state.pendingSpawns.length > normal.state.pendingSpawns.length, true);
});