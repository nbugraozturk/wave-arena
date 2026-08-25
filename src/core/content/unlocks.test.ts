import test from "node:test";
import assert from "node:assert/strict";

import { Simulation } from "../Simulation";
import { availableBoosts } from "./catalog";
import { addMasteryXp, calculateMasteryXpGain, getUnlockedContentIds, MAX_MASTERY_XP, UNLOCKS } from "./unlocks";

test("mastery gain is small, deterministic, and rewards a completed run", () => {
    assert.equal(calculateMasteryXpGain(3, false), 3);
    assert.equal(calculateMasteryXpGain(3, true), 5);
    assert.equal(calculateMasteryXpGain(999, true), 12);
});

test("mastery XP is bounded by the progression cap", () => {
    assert.equal(addMasteryXp(98, 10), MAX_MASTERY_XP);
    assert.equal(addMasteryXp(-4, 2), 2);
});

test("unlock registry exposes content only after its mastery threshold", () => {
    assert.deepEqual(getUnlockedContentIds({ masteryXp: 0 }), []);
    assert.deepEqual(getUnlockedContentIds({ masteryXp: 20 }), ["bouncing_rounds"]);
    assert.deepEqual(getUnlockedContentIds({ masteryXp: 60 }), UNLOCKS.map((unlock) => unlock.id));
});

test("locked boosts are excluded from offers and unlocked boosts are eligible", () => {
    const simulation = new Simulation({ seed: 4, maxWaves: 8 });
    simulation.selectClass("marksman");
    simulation.state.waveIndex = 5;
    const locked = availableBoosts([], 5).map((boost) => boost.id);
    assert.equal(locked.some((id) => id === "bouncing_rounds" || id === "overcharged_core"), false);

    simulation.profile.masteryXp = 60;
    const unlocked = availableBoosts([], 5, getUnlockedContentIds(simulation.profile)).map((boost) => boost.id);
    assert.equal(unlocked.includes("bouncing_rounds"), true);
    assert.equal(unlocked.includes("overcharged_core"), true);
    const offers = (simulation as any).rollOffers() as Array<{ id: string }>;
    assert.equal(offers.every((boost) => unlocked.includes(boost.id)), true);
});

test("completed runs add mastery and persist new profile fields", () => {
    const simulation = new Simulation({ seed: 5, maxWaves: 8 });
    simulation.state.waveIndex = 8;
    (simulation as any).recordRun(true);
    assert.equal(simulation.profile.masteryXp, calculateMasteryXpGain(8, true));
    assert.deepEqual(simulation.profile.unlockedBoosts, []);

    simulation.profile.masteryXp = 58;
    (simulation as any).recordRun(false);
    assert.equal(simulation.profile.masteryXp, 64);
    assert.deepEqual(simulation.profile.unlockedBoosts, ["bouncing_rounds", "overcharged_core"]);

    const restored = new Simulation({ seed: 6, maxWaves: 8 });
    assert.equal(restored.loadProfile(simulation.saveProfile()), true);
    assert.equal(restored.profile.masteryXp, 64);
    assert.deepEqual(restored.profile.unlockedBoosts, ["bouncing_rounds", "overcharged_core"]);
});

test("v1 profiles without Phase 5 fields still load with safe defaults", () => {
    const simulation = new Simulation({ seed: 7, maxWaves: 8 });
    assert.equal(simulation.loadProfile(JSON.stringify({ version: 1, legacyShards: 2, runsCompleted: 1, bestWave: 2, unlockedClasses: ["vanguard"] })), true);
    assert.equal(simulation.profile.masteryXp, 0);
    assert.deepEqual(simulation.profile.unlockedBoosts, []);
    assert.deepEqual(simulation.profile.unlockedEnemyVariants, []);
});