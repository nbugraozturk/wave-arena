import test from "node:test";
import assert from "node:assert/strict";

import type { RunRecord } from "../types";
import { addRunRecord, createRunRecord, getTopRuns, parseLeaderboard, serializeLeaderboard } from "./leaderboard";

const record = (overrides: Partial<RunRecord> = {}): RunRecord => createRunRecord({
    waveIndex: 5,
    kills: 20,
    seed: 42,
    timestamp: 100,
    classId: "vanguard",
    ascensionLevel: 0,
    challengeMode: "normal",
    victory: false,
    ...overrides,
});

test("leaderboard sorts victories and best waves first", () => {
    const runs = [record({ waveIndex: 8, kills: 10 }), record({ waveIndex: 8, kills: 20, victory: true }), record({ waveIndex: 9, kills: 2 })];
    assert.deepEqual(getTopRuns(runs, "vanguard", 0).map((run) => run.waveIndex), [9, 8, 8]);
    assert.equal(getTopRuns(runs, "vanguard", 0)[1].victory, true);
});

test("leaderboard keeps separate class and Ascension categories", () => {
    const runs = [record(), record({ classId: "marksman" }), record({ ascensionLevel: 1 })];
    assert.equal(getTopRuns(runs, "vanguard", 0).length, 1);
    assert.equal(getTopRuns(runs, "marksman", 0).length, 1);
    assert.equal(getTopRuns(runs, "vanguard", 1).length, 1);
});

test("leaderboard keeps only the best result for a repeated seed", () => {
    let runs: RunRecord[] = [];
    runs = addRunRecord(runs, record({ seed: 77, waveIndex: 4 }));
    runs = addRunRecord(runs, record({ seed: 77, waveIndex: 8 }));
    runs = addRunRecord(runs, record({ seed: 77, waveIndex: 2 }));

    assert.equal(getTopRuns(runs, "vanguard", 0).length, 1);
    assert.equal(getTopRuns(runs, "vanguard", 0)[0].waveIndex, 8);
});

test("leaderboard is bounded to ten runs per category", () => {
    let runs: RunRecord[] = [];
    for (let wave = 1; wave <= 12; wave++) runs = addRunRecord(runs, record({ waveIndex: wave, seed: wave }));
    assert.equal(getTopRuns(runs, "vanguard", 0).length, 10);
    assert.equal(getTopRuns(runs, "vanguard", 0)[0].waveIndex, 12);
});

test("leaderboard serialization filters invalid data and round-trips valid data", () => {
    const runs = [record({ victory: true })];
    const restored = parseLeaderboard(serializeLeaderboard(runs));
    assert.deepEqual(restored, runs);
    assert.deepEqual(parseLeaderboard(JSON.stringify({ version: 1, runs: [{ invalid: true }] })), []);
    assert.deepEqual(parseLeaderboard("invalid"), []);
});