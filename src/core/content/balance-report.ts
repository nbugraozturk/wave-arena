import { availableBoosts, buildWaves, ENEMIES, weightFor } from "./catalog";
import { getEliteChance, getEliteModifierMultipliers } from "./elite-system";
import type { BoostRarity } from "../types";

export interface BalanceRarityPool {
  count: number;
  totalBaseWeight: number;
}

export interface BalanceWaveReport {
  waveIndex: number;
  enemyCount: number;
  guaranteedTotalHp: number;
  enemyGroups: Array<{ enemyId: string; name: string; count: number; hpEach: number; totalHp: number }>;
  bosses: string[];
  eliteWave: boolean;
  guaranteedModifiers: string[];
  randomEliteChance: number;
  spawnInterval: number;
  boostPool: Record<BoostRarity, BalanceRarityPool>;
}

const RARITIES: BoostRarity[] = ["common", "rare", "epic", "legendary"];

export function createBalanceReport(maxWaves = 12): BalanceWaveReport[] {
  if (!Number.isInteger(maxWaves) || maxWaves < 1 || maxWaves > 100) {
    throw new RangeError("maxWaves must be an integer from 1 to 100");
  }

  return buildWaves(maxWaves).map((wave) => {
    const hpScale = (1 + (wave.index - 1) * 0.12) * getEliteModifierMultipliers(wave.modifiers ?? []).hp;
    const enemyCount = wave.groups.reduce((sum, group) => sum + group.count, 0);
    let guaranteedTotalHp = 0;
    const bosses: string[] = [];
    const enemyGroups: BalanceWaveReport["enemyGroups"] = [];

    for (const group of wave.groups) {
      const enemy = ENEMIES[group.enemyId]!;
      const hpEach = Math.ceil(enemy.hp * hpScale);
      const totalHp = hpEach * group.count;
      guaranteedTotalHp += totalHp;
      enemyGroups.push({ enemyId: enemy.id, name: enemy.displayName ?? enemy.id, count: group.count, hpEach, totalHp });
      if (enemy.isBoss) bosses.push((enemy.displayName ?? enemy.id) + " x" + group.count);
    }

    const pool = availableBoosts([], wave.index);
    const boostPool = Object.fromEntries(RARITIES.map((rarity) => {
      const matching = pool.filter((boost) => boost.rarity === rarity);
      return [rarity, {
        count: matching.length,
        totalBaseWeight: matching.reduce((sum, boost) => sum + weightFor(boost, wave.index, null), 0),
      }];
    })) as Record<BoostRarity, BalanceRarityPool>;

    return {
      waveIndex: wave.index,
      enemyCount,
      guaranteedTotalHp,
      enemyGroups,
      bosses,
      eliteWave: Boolean(wave.elite),
      guaranteedModifiers: [...(wave.modifiers ?? [])],
      randomEliteChance: getEliteChance(wave.index),
      spawnInterval: wave.spawnInterval,
      boostPool,
    };
  });
}
