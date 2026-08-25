import test from "node:test";
import assert from "node:assert/strict";

import { Simulation } from "./Simulation";

test("simulation exposes its active seed and same-seed reset preserves it", () => {
    const simulation = new Simulation({ seed: 12345, maxWaves: 8 });
    assert.equal(simulation.getSeed(), 12345);

    simulation.reset(true);

    assert.equal(simulation.getSeed(), 12345);
});

test("normal reset keeps the existing random restart behavior", () => {
    const simulation = new Simulation({ seed: 12345, maxWaves: 8 });
    const initialSeed = simulation.getSeed();

    simulation.reset();

    assert.notEqual(simulation.getSeed(), initialSeed);
});

test("victory records the furthest wave for Ascension unlock progress", () => {
    const simulation = new Simulation({ seed: 12345, maxWaves: 12 });
    simulation.state.waveIndex = 12;

    (simulation as any).recordRun(true);

    assert.equal(simulation.profile.bestWave, 12);
    assert.equal(simulation.profile.runsCompleted, 1);
});

test("daily and weekly challenge resets remain tied to their configured seed", () => {
    const simulation = new Simulation({
        seed: 12345,
        maxWaves: 8,
        dailyChallenge: {
            id: "daily-test",
            mode: "daily",
            date: "2026-08-25",
            character: "vanguard",
            seed: 12345,
            mutators: [],
            difficulty: 1,
            rules: [],
            goal: "test",
        },
    });

    simulation.reset();

    assert.equal(simulation.getSeed(), 12345);
});