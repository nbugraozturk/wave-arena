import test from "node:test";
import assert from "node:assert/strict";

import { buildWaves, getFutureWavePreviews } from "./catalog";
import { bountiesForWave, canFuse, canFuseWithState, createRouteOptions, createShopInventory, eventById, FUSION_RECIPES, missingFusionIngredients, PACTS } from "./strategic";
import { CLASSES } from "./classes";
import { buildDailyChallenge } from "./mutators";
import { Simulation } from "../Simulation";

test("fusion recipes consume duplicate ingredients without changing the catalog", () => {
    assert.equal(canFuse(["firerate", "firerate"], FUSION_RECIPES[0]), true);
    assert.equal(canFuse(["firerate"], FUSION_RECIPES[0]), false);
});

test("route options expose distinct risk and reward choices", () => {
    const options = createRouteOptions(6);
    assert.equal(options.length, 3);
    assert.equal(new Set(options.map((option) => option.type)).size, 3);
    assert.ok(options.some((option) => option.risk === 0));
    assert.ok(options.some((option) => option.risk >= 1));
    const rest = options.find((option) => option.type === "rest");
    const combat = options.find((option) => option.type === "combat");
    assert.ok(rest && /35%|heals|restore/i.test(rest.description));
    assert.ok(combat && /standard|next wave|dengeli/i.test(combat.description));
});

test("every fourth generated wave is an elite forecast", () => {
    const waves = buildWaves(8);
    assert.equal(waves[3].elite, true);
    assert.deepEqual(waves[3].modifiers, ["fast"]);
    assert.equal(waves[4].elite, false);
});

test("future previews expose three decisions and mark distant waves uncertain", () => {
    const previews = getFutureWavePreviews(9);
    assert.equal(previews.length, 3);
    assert.equal(previews[0].certainty, "known");
    assert.equal(previews[2].certainty, "unknown");
});

test("events and shop inventory provide distinct strategic outcomes", () => {
    const shrine = eventById("mysterious-shrine");
    assert.equal(shrine?.choices.length, 3);
    assert.ok(shrine?.choices.some((choice) => choice.effect.artifactId));
    assert.equal(new Set(createShopInventory().map((item) => item.kind)).size, 4);
});

test("run save/load preserves strategic state", () => {
    const source = new Simulation({ seed: 7, maxWaves: 6 });
    source.selectClass("marksman");
    source.state.gold = 42;
    source.state.evolutionShards = 3;
    source.state.level = 4;
    source.state.xp = 73;
    source.state.pendingLevelUps = 1;
    source.state.artifacts.push("magnet");
    const restored = new Simulation({ seed: 99, maxWaves: 6 });
    assert.equal(restored.loadRun(source.saveRun()), true);
    assert.equal(restored.state.classId, "marksman");
    assert.equal(restored.state.gold, 42);
    assert.equal(restored.state.level, 4);
    assert.equal(restored.state.xp, 73);
    assert.equal(restored.state.pendingLevelUps, 1);
    assert.deepEqual(restored.state.artifacts, ["magnet"]);
    assert.equal(restored.loadRun("{}"), false);

    const corrupted = JSON.parse(source.saveRun()) as { state: Record<string, unknown> };
    corrupted.state.level = "invalid";
    corrupted.state.xp = "invalid";
    assert.equal(restored.loadRun(JSON.stringify(corrupted)), true);
    assert.equal(restored.state.level, 1);
    assert.equal(restored.state.xp, 0);
});

test("earned gold can open the shop and purchase an item", () => {
    const simulation = new Simulation({ seed: 3, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.gold = 50;
    simulation.state.phase = "route";
    simulation.state.routeOptions = createRouteOptions(2);
    const shop = simulation.state.routeOptions.find((node) => node.type === "shop");
    assert.ok(shop);
    assert.equal(simulation.selectRoute(shop.id), true);
    assert.equal(simulation.state.phase, "shop");
    assert.equal(simulation.buyShopItem("shop-reroll"), true);
    assert.equal(simulation.state.gold, 20);
    assert.equal(simulation.state.rerollTokens, 1);
});

test("elite bounty is only offered on elite waves", () => {
    assert.equal(bountiesForWave(false).some((bounty) => bounty.target === "elite"), false);
    assert.equal(bountiesForWave(true).some((bounty) => bounty.target === "elite"), true);
});

test("archetypes expose distinct gameplay passives", () => {
    assert.deepEqual(CLASSES.map((cls) => cls.passive.id), ["berserker_rage", "deadeye", "elemental_attunement"]);
    assert.equal(new Set(CLASSES.map((cls) => cls.passive.id)).size, CLASSES.length);
});

test("shop weighting prefers artifacts that match the current build", () => {
    assert.equal(createShopInventory(["lifesteal"])[0].artifactId, "vampire_fang");
    assert.equal(createShopInventory(["multishot"])[0].artifactId, "bullet_core");
});

test("anti-snowball limits remain bounded", () => {
    const simulation = new Simulation({ seed: 4, maxWaves: 6 });
    assert.equal(simulation.state.artifactSlots, 4);
    assert.equal(PACTS.length > 0, true);
    simulation.state.phase = "route";
    assert.equal(simulation.choosePact(PACTS[0].id), true);
    assert.equal(simulation.choosePact(PACTS[1].id), false);
    assert.ok(createShopInventory().every((item) => item.price >= 20));
});

test("fusion availability includes shard count and artifact capacity in one check", () => {
    const recipe = FUSION_RECIPES[1];
    assert.equal(canFuseWithState(["fire_damage", "multishot"], recipe, 2, ["magnet"], 4), true);
    assert.equal(canFuseWithState(["fire_damage", "multishot"], recipe, 1, ["magnet"], 4), false);
    assert.equal(canFuseWithState(["fire_damage", "multishot"], recipe, 2, ["magnet", "vampire_fang", "cursed_skull", "bullet_core"], 4), false);
    assert.equal(canFuseWithState(["fire_damage"], recipe, 2, ["magnet"], 4), false);
    assert.deepEqual(missingFusionIngredients(["fire_damage"], recipe), ["multishot"]);
    assert.deepEqual(missingFusionIngredients(["fire_damage", "multishot"], recipe), []);
});

test("fusion stacks the result card instead of replacing it, with a burn tradeoff", () => {
    const simulation = new Simulation({ seed: 99, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.phase = "boost";
    simulation.state.evolutionShards = 3;
    simulation.state.appliedBoostIds = ["burn_duration", "burn_spread"];
    const beforeHp = simulation.state.player.hp;

    assert.equal(simulation.fuse("inferno"), true);
    assert.equal(simulation.state.appliedBoostIds.filter((id) => id === "burn_spread").length, 2);
    assert.ok(simulation.state.appliedBoostIds.includes("burn_duration") === false, "burn_duration should be consumed");
    assert.ok(simulation.state.player.hp < beforeHp, "fusion should burn a little health as its tradeoff");
});

test("profile progression persists completed-run rewards", () => {
    const source = new Simulation({ seed: 8, maxWaves: 6 });
    source.profile.legacyShards = 7;
    source.profile.runsCompleted = 2;
    source.profile.bestWave = 4;
    const restored = new Simulation({ seed: 9, maxWaves: 6 });
    assert.equal(restored.loadProfile(source.saveProfile()), true);
    assert.deepEqual(restored.profile, source.profile);
    assert.equal(restored.loadProfile("{\"version\":2}"), false);
});

test("profile achievement progress is backward compatible and filtered", () => {
    const source = new Simulation({ seed: 8, maxWaves: 6 });
    source.profile.achievements = ["first_run", "unknown-achievement"];
    const restored = new Simulation({ seed: 9, maxWaves: 6 });
    assert.equal(restored.loadProfile(source.saveProfile()), true);
    assert.deepEqual(restored.profile.achievements, ["first_run"]);

    const legacy = JSON.stringify({ version: 1, legacyShards: 2, runsCompleted: 1, bestWave: 2, unlockedClasses: ["vanguard"] });
    assert.equal(restored.loadProfile(legacy), true);
    assert.deepEqual(restored.profile.achievements, []);
});

test("legacy shards grant a bounded starting reroll bonus", () => {
    const simulation = new Simulation({ seed: 10, maxWaves: 6 });
    simulation.profile.legacyShards = 15;
    simulation.selectClass("vanguard");
    assert.equal(simulation.state.rerollCharges, 3);
});

test("temporary timing bonuses are mutually exclusive", () => {
    const simulation = new Simulation({ seed: 11, maxWaves: 6 });
    simulation.selectClass("vanguard");
    simulation.state.phase = "boost";
    assert.equal(simulation.activateTemporaryEffect("overclock"), true);
    assert.equal(simulation.activateTemporaryEffect("fortified"), false);
    assert.equal(simulation.state.activeTemporaryEffects.length, 1);
});

test("Swarm Pact increases the next wave spawn count", () => {
    const simulation = new Simulation({ seed: 12, maxWaves: 6 });
    simulation.selectClass("marksman");
    const base = new Simulation({ seed: 12, maxWaves: 6 });
    base.selectClass("marksman");
    base.state.phase = "route";
    base.state.routeOptions = createRouteOptions(2);
    assert.equal(base.selectRoute("combat-2-0"), true);
    simulation.state.phase = "route";
    simulation.state.routeOptions = createRouteOptions(2);
    assert.equal(simulation.choosePact("swarm-pact"), true);
    assert.equal(simulation.selectRoute("combat-2-0"), true);
    assert.ok(simulation.state.pendingSpawns.length > base.state.pendingSpawns.length);
});

test("wave spawning recovers when the frame timer becomes invalid", () => {
    const simulation = new Simulation({ seed: 13, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.waveIndex = 6;
    simulation.state.phase = "combat";
    (simulation as any).hydrateWave(simulation.state, 6);
    const before = simulation.state.pendingSpawns.length;
    simulation.state.spawnCooldown = Number.NaN;
    simulation.tick(Number.NaN, { moveX: 0, moveY: 0, aimX: 1440, aimY: 810, firing: false, ult: false });
    assert.equal(simulation.state.pendingSpawns.length, before - 1);
    assert.equal(Number.isFinite(simulation.state.spawnCooldown), true);
});

test("pickup and enemy spawn positions use varied perimeter samples", () => {
    const simulation = new Simulation({ seed: 14, maxWaves: 6 });
    simulation.selectClass("marksman");
    const pickupPositions = simulation.state.pickups.map((pickup) => `${pickup.position.x}:${pickup.position.y}`);
    assert.equal(new Set(pickupPositions).size, pickupPositions.length);
    assert.ok(simulation.state.pickups.some((pickup) => ![360, 820, 1440, 2040, 2460, 720, 1800, 2480].includes(pickup.position.x)));

    const enemyPositions = Array.from({ length: 12 }, () => (simulation as any).makeEnemy("grunt").position);
    const enemySamples = enemyPositions.map((position) => `${position.x}:${position.y}`);
    assert.equal(new Set(enemySamples).size, enemySamples.length);
    assert.ok(enemyPositions.some((position) => position.x > 0 && position.x < 2880 && (position.y < 0 || position.y > 1620)));
});

test("normal restarts refresh spawn randomness while challenges remain seeded", () => {
    const normal = new Simulation({ seed: 15, maxWaves: 6 });
    normal.selectClass("marksman");
    const first = normal.state.pickups.map((pickup) => `${pickup.position.x}:${pickup.position.y}`).join("|");
    normal.reset();
    normal.selectClass("marksman");
    const second = normal.state.pickups.map((pickup) => `${pickup.position.x}:${pickup.position.y}`).join("|");
    assert.notEqual(first, second);

    const challenge = buildDailyChallenge("2026-08-24");
    const seeded = new Simulation({ seed: challenge.seed, maxWaves: 10, mutators: challenge.mutators, dailyChallenge: challenge });
    seeded.selectClass("marksman");
    const challengeFirst = seeded.state.pickups.map((pickup) => `${pickup.position.x}:${pickup.position.y}`).join("|");
    seeded.reset();
    seeded.selectClass("marksman");
    const challengeSecond = seeded.state.pickups.map((pickup) => `${pickup.position.x}:${pickup.position.y}`).join("|");
    assert.equal(challengeFirst, challengeSecond);
});

test("Pact completion grants its reward only once", () => {
    const simulation = new Simulation({ seed: 13, maxWaves: 6 });
    simulation.selectClass("marksman");
    simulation.state.activePacts = ["blood-pact"];
    simulation.state.pactRewardClaimed = false;
    simulation.state.pendingSpawns = [];
    simulation.state.enemies = [];
    simulation.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });
    assert.equal(simulation.state.pactRewardClaimed, true);
    assert.equal(simulation.state.evolutionShards, 2);
    const shards = simulation.state.evolutionShards;
    simulation.state.phase = "combat";
    simulation.state.pendingSpawns = [];
    simulation.state.enemies = [];
    simulation.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });
    assert.equal(simulation.state.evolutionShards, shards);
});