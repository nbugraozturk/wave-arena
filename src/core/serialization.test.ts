import test from "node:test";
import assert from "node:assert/strict";

import { Simulation } from "./Simulation";

test("profile v1 round-trips all progression fields and filters unknown IDs", () => {
  const source = new Simulation({ seed: 31, maxWaves: 5 });
  source.profile.legacyShards = 12;
  source.profile.runsCompleted = 7;
  source.profile.bestWave = 11;
  source.profile.achievements = ["first_run"];
  source.profile.masteryXp = 85;
  source.profile.unlockedBoosts = ["bouncing_rounds"];
  source.profile.unlockedEnemyVariants = [];

  const restored = new Simulation({ seed: 32, maxWaves: 5 });
  assert.equal(restored.loadProfile(source.saveProfile()), true);
  assert.deepEqual(restored.profile, source.profile);
});

test("profile parsing rejects malformed, missing, and unsupported versions without replacing the current profile", () => {
  const simulation = new Simulation({ seed: 33, maxWaves: 5 });
  simulation.profile.legacyShards = 9;
  const before = structuredClone(simulation.profile);

  for (const payload of ["", "null", "{}", "{\"version\":2,\"unlockedClasses\":[]}", "{\"version\":1,\"unlockedClasses\":\"vanguard\"}"]) {
    assert.equal(simulation.loadProfile(payload), false);
    assert.deepEqual(simulation.profile, before);
  }
});

test("profile v1 legacy payloads receive safe defaults for fields added later", () => {
  const simulation = new Simulation({ seed: 34, maxWaves: 5 });
  assert.equal(
    simulation.loadProfile(JSON.stringify({ version: 1, legacyShards: 2, runsCompleted: 1, bestWave: 4, unlockedClasses: ["vanguard"] })),
    true,
  );
  assert.equal(simulation.profile.masteryXp, 0);
  assert.deepEqual(simulation.profile.achievements, []);
});

test("run v2 round-trips gameplay state and RNG continuation exactly", () => {
  const source = new Simulation({ seed: 35, maxWaves: 5 });
  source.selectClass("marksman");
  source.state.gold = 47;
  source.state.freeRerollCharges = 2;
  source.state.appliedBoostIds.push("firerate");
  source.tick(1 / 60, { moveX: 0.25, moveY: -1, aimX: 2200, aimY: 700, firing: true, ult: false });
  const serialized = source.saveRun();
  const restored = new Simulation({ seed: 36, maxWaves: 5 });

  assert.equal(restored.loadRun(serialized), true);
  assert.deepEqual(JSON.parse(restored.saveRun()), JSON.parse(serialized));
  source.tick(1 / 60, { moveX: 0, moveY: 0, aimX: 1300, aimY: 700, firing: false, ult: false });
  restored.tick(1 / 60, { moveX: 0, moveY: 0, aimX: 1300, aimY: 700, firing: false, ult: false });
  assert.deepEqual(restored.state, source.state);
});

test("legacy run payloads normalize new optional fields without losing saved progression", () => {
  const source = new Simulation({ seed: 37, maxWaves: 5 });
  source.selectClass("vanguard");
  source.state.gold = 52;
  const oldPayload = JSON.parse(source.saveRun()) as { version: number; state: Record<string, unknown>; rngState: number };
  oldPayload.version = 1;
  delete oldPayload.state.challengeMode;
  delete oldPayload.state.challenge;
  delete oldPayload.state.activeRunModifiers;
  delete oldPayload.state.activeAscensionLevel;
  delete oldPayload.state.freeRerollCharges;

  const restored = new Simulation({ seed: 38, maxWaves: 5 });
  assert.equal(restored.loadRun(JSON.stringify(oldPayload)), true);
  assert.equal(restored.state.gold, 52);
  assert.equal(restored.state.challengeMode, "normal");
  assert.equal(restored.state.challenge, null);
  assert.deepEqual(restored.state.activeRunModifiers, []);
  assert.equal(restored.state.activeAscensionLevel, 0);
  assert.equal(restored.state.freeRerollCharges, 0);
});

test("run parsing rejects malformed or incomplete payloads without replacing the active run", () => {
  const simulation = new Simulation({ seed: 39, maxWaves: 5 });
  simulation.selectClass("warden");
  const before = structuredClone(simulation.state);
  for (const payload of ["", "{}", "{\"version\":2,\"state\":null,\"rngState\":0}", "{\"state\":{\"phase\":\"combat\",\"appliedBoostIds\":[]},\"rngState\":0}", "{\"state\":{\"phase\":\"combat\",\"appliedBoostIds\":[],\"player\":{}},\"rngState\":1}"]) {
    assert.equal(simulation.loadRun(payload), false);
    assert.deepEqual(simulation.state, before);
  }
});
