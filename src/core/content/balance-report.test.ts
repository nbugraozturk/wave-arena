import test from "node:test";
import assert from "node:assert/strict";

import { createBalanceReport } from "./balance-report";

test("balance report exposes per-wave count, HP scaling, bosses, and elite modifiers", () => {
  const report = createBalanceReport(12);
  assert.equal(report.length, 12);
  assert.equal(report[0].enemyCount, 5);
  assert.equal(report[0].guaranteedTotalHp, 120);
  assert.deepEqual(report[0].enemyGroups, [{ enemyId: "grunt", name: "grunt", count: 5, hpEach: 24, totalHp: 120 }]);
  assert.equal(report[0].spawnInterval, 0.495);
  assert.equal(report[0].randomEliteChance, 0);

  assert.deepEqual(report[2].bosses, ["Dalga Hakimi x1"]);
  assert.equal(report[3].eliteWave, true);
  assert.deepEqual(report[3].guaranteedModifiers, ["fast"]);
  assert.equal(report[7].guaranteedTotalHp > report[6].guaranteedTotalHp, true);
  assert.equal(report[9].randomEliteChance, 0.15);
});

test("balance report includes rarity pool sizes and total offer weights", () => {
  const report = createBalanceReport(8);
  const waveOne = report[0];
  const waveFive = report[4];
  const waveEight = report[7];
  assert.equal(waveOne.boostPool.common.count, 8);
  assert.equal(waveOne.boostPool.common.totalBaseWeight, 64);
  assert.equal(waveFive.boostPool.epic.totalBaseWeight, waveOne.boostPool.epic.totalBaseWeight + 14);
  assert.equal(waveEight.boostPool.rare.totalBaseWeight, waveFive.boostPool.rare.totalBaseWeight + 14);
});

test("balance report rejects unsupported wave limits", () => {
  assert.throws(() => createBalanceReport(0), RangeError);
  assert.throws(() => createBalanceReport(101), RangeError);
});
