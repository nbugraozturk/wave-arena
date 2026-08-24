import test from "node:test";
import assert from "node:assert/strict";

import { getBuildSummary, getWavePreview, getUpgradeOptions } from "./catalog";
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
