import test from "node:test";
import assert from "node:assert/strict";

import { getBuildSummary, getWavePreview, getUpgradeOptions, getXpRequiredForLevel } from "./catalog";
import { buildDailyChallenge, buildWeeklyChallenge, getMutatorById, getMutatorsForDate, FEATURE_FLAGS } from "./mutators";
import { Simulation } from "../Simulation";

test("build summary flags a projectile synergy when thresholds are reached", () => {
    const summary = getBuildSummary(["multishot", "multishot", "velocity", "pierce", "pierce"]);
    assert.equal(summary.activeSynergies.includes("projectile-build"), true);
    assert.equal(summary.evolutions.length > 0, true);
});

test("wave preview includes strategic threats for the next wave", () => {
    const preview = getWavePreview(3);
    assert.ok(preview.threats.length > 0);
    assert.ok(preview.summary.length > 0);
});

test("upgrade options prefer the current build while staying varied", () => {
    const offers = getUpgradeOptions(["multishot", "velocity"], 2, "marksman", 3);
    assert.equal(offers.length, 3);
    assert.ok(offers.some((boost) => boost.id === "pierce" || boost.id === "damage"));
});

test("reroll exclusions remove the current cards from the next offer set", () => {
    const offers = getUpgradeOptions([], 2, "marksman", 3, ["damage", "firerate", "velocity"]);
    assert.equal(offers.some((boost) => ["damage", "firerate", "velocity"].includes(boost.id)), false);
});

test("repeated offers for the same build stay varied instead of cycling the same three upgrades", () => {
    const simulation = new Simulation({ seed: 21, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.appliedBoostIds = ["multishot", "velocity"];

    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
        const offers = (simulation as any).rollOffers();
        for (const boost of offers) seen.add(boost.id);
    }

    assert.ok(seen.size >= 5, `Expected at least 5 distinct offers across repeated rolls, got ${seen.size}: ${[...seen].join(", ")}`);
});

test("xp thresholds use a data-driven progression curve and preserve overflow", () => {
    assert.equal(getXpRequiredForLevel(1), 100);
    assert.equal(getXpRequiredForLevel(2), 150);
    assert.equal(getXpRequiredForLevel(3), 220);

    const simulation = new Simulation({ seed: 7, maxWaves: 8 });
    simulation.selectClass("marksman");
    simulation.state.level = 1;
    simulation.state.xp = 90;

    (simulation as any).grantXp(50);

    assert.equal(simulation.state.level, 2);
    assert.equal(simulation.state.xp, 40);
    assert.equal(simulation.state.phase, "boost");
    assert.ok(simulation.state.boostOffers.length > 0);
});

test("an in-wave level-up returns to combat instead of skipping the wave", () => {
    const simulation = new Simulation({ seed: 14, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.phase = "boost";
    simulation.state.strategicPhase = "boost";
    simulation.state.pendingLevelUps = 1;
    simulation.state.pendingSpawns = [{ defId: "grunt" }];
    simulation.state.boostOffers = (simulation as any).rollOffers();

    simulation.selectBoost(simulation.state.boostOffers[0].id);

    assert.equal(simulation.state.phase, "combat");
    assert.equal(simulation.state.strategicPhase, "combat");
    assert.equal(simulation.state.pendingLevelUps, 0);
    assert.deepEqual(simulation.state.routeOptions, []);
});

test("mutators are data-driven and daily challenges generate deterministic rulesets", () => {
    assert.ok(FEATURE_FLAGS.ENABLE_MUTATORS, "Mutator flag should be enabled by default");
    const vampire = getMutatorById("vampire_night");
    assert.ok(vampire);
    assert.equal(vampire?.description.length > 0, true);

    const today = buildDailyChallenge("2026-08-24");
    assert.equal(today.mode, "daily");
    assert.equal(today.mutators.length > 0, true);
    assert.equal(today.seed > 0, true);

    const byDate = getMutatorsForDate("2026-08-24");
    assert.deepEqual(byDate, today.mutators);

    const sim = new Simulation({ seed: today.seed, maxWaves: 10, mutators: today.mutators, dailyChallenge: today });
    assert.equal(sim.state.mutators.length, today.mutators.length);
    assert.equal(sim.state.challengeMode, "daily");
    assert.equal(sim.state.challenge?.id, today.id);
});

test("mutators change runtime stats while normal runs retain baseline values", () => {
    const normal = new Simulation({ seed: 12, maxWaves: 6 });
    normal.selectClass("marksman");
    const normalEnemy = (normal as any).makeEnemy("grunt");

    const modified = new Simulation({ seed: 12, maxWaves: 6, mutators: ["vampire_night", "glass_world"] });
    modified.selectClass("marksman");
    const modifiedEnemy = (modified as any).makeEnemy("grunt");

    assert.equal(modified.state.stats.maxHp, normal.state.stats.maxHp * 0.5);
    assert.equal(modified.state.stats.projectileDamage, normal.state.stats.projectileDamage * 1.75);
    assert.equal(modifiedEnemy.speed, normalEnemy.speed * 1.2);
    assert.equal(modifiedEnemy.contactDamage, normalEnemy.contactDamage * 1.08);

    const horde = new Simulation({ seed: 12, maxWaves: 6, mutators: ["endless_horde"] });
    horde.selectClass("marksman");
    assert.ok(horde.state.pendingSpawns.length > normal.state.pendingSpawns.length);
});

test("weekly challenges are deterministic and isolated as weekly runs", () => {
    assert.ok(FEATURE_FLAGS.ENABLE_WEEKLY_CHALLENGE, "Weekly challenge flag should be enabled");
    const first = buildWeeklyChallenge("2026-W35");
    const second = buildWeeklyChallenge("2026-W35");
    assert.deepEqual(first, second);
    assert.equal(first.mode, "weekly");
    assert.equal(first.goal, "Reach Wave 40");
    const sim = new Simulation({ seed: first.seed, maxWaves: 40, mutators: first.mutators, dailyChallenge: first });
    assert.equal(sim.state.challengeMode, "weekly");
    assert.equal(sim.state.challenge?.id, first.id);
});
