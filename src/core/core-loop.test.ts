import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "./Simulation";
import type { GameState } from "./types";

/**
 * PHASE 0.1 SMOKE TEST HARNESS
 * 
 * Tests the core gameplay loop without manual player input or complex timings:
 * 1. Start a run (class selection)
 * 2. Complete 3 waves (enemies cleared, wave transitions)
 * 3. Level up (upgrade offered)
 * 4. Choose upgrade (boost selected)
 * 5. Continue to next wave
 */

/**
 * Helper: Simulate wave completion by clearing enemies and pending spawns.
 * This bypasses combat simulation while testing state transitions.
 */
function completeCurrentWave(sim: Simulation): void {
    const state = sim.state as GameState;
    state.pendingSpawns = [];
    state.enemies = [];
    // Trigger the wave-end check on next tick
}

/**
 * Helper: Auto-complete the boost selection phase by choosing the first available upgrade.
 * Returns true if boost was selected, false if phase wasn't "boost".
 */
function autoSelectBoost(sim: Simulation): boolean {
    if (sim.state.phase !== "boost") return false;
    if (sim.state.boostOffers.length === 0) return false;
    sim.selectBoost(sim.state.boostOffers[0].id);
    return true;
}

/**
 * Helper: Auto-complete the route selection phase by choosing a combat node.
 * Returns true if route was selected, false if phase wasn't "route".
 */
function autoSelectRoute(sim: Simulation): boolean {
    if (sim.state.phase !== "route") return false;
    const combatRoute = sim.state.routeOptions.find((option) => option.type === "combat");
    if (!combatRoute) {
        // Fallback to first available route
        return sim.selectRoute(sim.state.routeOptions[0]?.id ?? "");
    }
    return sim.selectRoute(combatRoute.id);
}

/**
 * Helper: Auto-complete the boss reward phase by choosing the first available reward.
 * Returns true if reward was selected, false if phase wasn't "boss_reward".
 */
function autoSelectBossReward(sim: Simulation): boolean {
    if (sim.state.phase !== "boss_reward") return false;
    if (sim.state.bossRewardOffers.length === 0) return false;
    const rewardId = sim.state.bossRewardOffers[0].id;
    if (!sim.selectBossReward(rewardId)) return false;
    return true;
}

/**
 * Helper: Advance from wave-end phase (boost/boss_reward) to next wave.
 * Handles both normal boost selection and boss reward selection.
 */
function advanceToNextWave(sim: Simulation): boolean {
    if (sim.state.phase === "boost") {
        if (!autoSelectBoost(sim)) return false;
    } else if (sim.state.phase === "boss_reward") {
        if (!autoSelectBossReward(sim)) return false;
    } else {
        return false;
    }

    // After boost/reward selection, should be in route phase
    // @ts-expect-error - phase will be "route" after selectBoost/selectBossReward is called
    if (sim.state.phase !== "route") return false;
    return autoSelectRoute(sim);
}

test("smoke test: core loop runs without errors (class select → 3 waves → upgrade flow)", () => {
    const sim = new Simulation({ seed: 42, maxWaves: 5 });

    // STEP 1: Start run (class selection)
    assert.equal(sim.state.phase, "class_select", "Should start in class_select phase");
    sim.selectClass("vanguard");
    assert.equal(sim.state.phase, "combat", "Should transition to combat after class selection");
    assert.equal(sim.state.waveIndex, 1, "Should start at wave 1");

    // STEP 2: Complete waves 1-3
    for (let waveNum = 1; waveNum <= 3; waveNum++) {
        assert.equal(sim.state.waveIndex, waveNum, `Should be on wave ${waveNum}`);
        assert.equal(sim.state.phase, "combat", `Wave ${waveNum} should start in combat phase`);

        // Simulate combat completion by clearing enemies
        completeCurrentWave(sim);

        // Tick to trigger wave-end detection
        sim.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });
        // After wave ends, should transition to boost or boss_reward phase
        assert(
            sim.state.phase === "boost" || sim.state.phase === "boss_reward",
            `After wave ${waveNum}, should be in boost or boss_reward phase, got ${sim.state.phase}`
        );
        assert(
            sim.state.boostOffers.length > 0 || sim.state.bossRewardOffers.length > 0,
            `Wave ${waveNum} should offer upgrades or rewards`
        );

        // STEP 3: Level up (by selecting a boost or boss reward)
        const advancedSuccessfully = advanceToNextWave(sim);
        assert(advancedSuccessfully, `Should successfully advance from wave ${waveNum} to next wave`);

        // After advancing, if this wasn't the final wave, should be in combat
        if (waveNum < 3) {
            assert(
                sim.state.phase === "combat",
                `After advancing from wave ${waveNum}, should be in combat phase, got ${sim.state.phase}`
            );
        }
    }

    // STEP 5: Verify final state
    const totalUpgrades = sim.state.appliedBoostIds.length + sim.state.bossCoreIds.length;
    assert(totalUpgrades >= 3, `Should have selected at least 3 upgrades (boosts + boss rewards) across 3 waves, got ${totalUpgrades}`);
    assert(sim.state.waveIndex >= 3, "Should have progressed through at least 3 waves");
    assert(sim.state.level >= 1, "Level should be at least 1");
});

test("smoke test: player survives waves (health tracking)", () => {
    const sim = new Simulation({ seed: 123, maxWaves: 5 });
    sim.selectClass("marksman");

    const initialHp = sim.state.player.hp;
    assert(initialHp > 0, "Player should start with health");

    for (let i = 0; i < 3; i++) {
        completeCurrentWave(sim);
        sim.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });

        assert(
            sim.state.phase === "boost" || sim.state.phase === "boss_reward",
            `Wave ${i + 1} should end in boost or boss_reward phase, got ${sim.state.phase}`
        );
        assert(sim.state.player.alive, `Player should still be alive after wave ${i + 1}`);
        assert(
            sim.state.player.hp > 0,
            `Player HP should be positive after wave ${i + 1}, got ${sim.state.player.hp}`
        );

        const advancedSuccessfully = advanceToNextWave(sim);
        assert(advancedSuccessfully, `Should advance from wave ${i + 1} to next`);
    }
});

test("smoke test: save/load preserves run state mid-wave", () => {
    const sim = new Simulation({ seed: 999, maxWaves: 5 });
    sim.selectClass("warden");
    sim.state.appliedBoostIds = ["armor", "maxhp"];

    // Save mid-run
    const runSnapshot = sim.saveRun();
    assert(runSnapshot.length > 0, "Save string should not be empty");

    // Advance state
    sim.state.level = 5;
    sim.state.xp = 250;
    const advancedLevel = sim.state.level;

    // Load previously saved state
    const loaded = sim.loadRun(runSnapshot);
    assert(loaded, "Should successfully load run state");
    assert.equal(sim.state.level, 1, "Loaded state should restore original level");
    assert.equal(sim.state.xp, 0, "Loaded state should restore original XP");
    assert.deepEqual(sim.state.appliedBoostIds, ["armor", "maxhp"], "Should preserve applied boosts");
});

test("smoke test: gameplay loop doesn't regress (3 consecutive runs)", () => {
    const seeds = [111, 222, 333];

    for (const seed of seeds) {
        const sim = new Simulation({ seed, maxWaves: 6 });
        sim.selectClass("vanguard");

        let wavesCompleted = 0;
        for (let wave = 1; wave <= 3; wave++) {
            assert.equal(
                sim.state.phase,
                "combat",
                `Seed ${seed}, wave ${wave}: should be in combat phase`
            );

            completeCurrentWave(sim);
            sim.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });

            const currentPhase = sim.state.phase as string;
            assert(
                currentPhase === "boost" || currentPhase === "boss_reward" || currentPhase === "victory",
                `Seed ${seed}, wave ${wave}: should end in boost, boss_reward, or victory, got ${currentPhase}`
            );

            if (currentPhase === "boost" || currentPhase === "boss_reward") {
                wavesCompleted++;
                const advancedSuccessfully = advanceToNextWave(sim);
                assert(
                    advancedSuccessfully,
                    `Seed ${seed}, wave ${wave}: should advance to next wave`
                );
            } else if (currentPhase === "victory") {
                wavesCompleted++;
            }
        }

        assert(
            wavesCompleted === 3,
            `Seed ${seed}: should complete 3 waves, completed ${wavesCompleted}`
        );
    }
});
