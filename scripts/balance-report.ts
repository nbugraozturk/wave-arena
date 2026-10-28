import { createBalanceReport } from "../src/core/content/balance-report";
import type { BoostRarity } from "../src/core/types";

const maxWaves = Number(process.argv[2] ?? 12);
if (!Number.isInteger(maxWaves) || maxWaves < 1 || maxWaves > 100) {
  process.stderr.write("Usage: npm run balance:report -- [max-waves: 1..100]\n");
  process.exit(1);
}

const rarities: BoostRarity[] = ["common", "rare", "epic", "legendary"];
const waves = createBalanceReport(maxWaves);

process.stdout.write("# Wave Arena Balance Report\n\n");
process.stdout.write("Baseline run - no run modifiers, pact, artifact, Ascension, or random elite roll.\n\n");
process.stdout.write("| Wave | Enemies | Guaranteed total HP | Enemy HP breakdown (count x HP) | Bosses | Elite / modifiers / random chance | Boost pool count / base weight (C/R/E/L) |\n");
process.stdout.write("| ---: | ---: | ---: | --- | --- | --- | ---: |\n");

for (const wave of waves) {
  const rarityPool = rarities.map((rarity) =>
    wave.boostPool[rarity].count + "/" + wave.boostPool[rarity].totalBaseWeight.toFixed(1),
  ).join(", ");
  process.stdout.write(
    "| " + wave.waveIndex +
    " | " + wave.enemyCount +
    " | " + wave.guaranteedTotalHp +
    " | " + wave.enemyGroups.map((group) => group.name + " " + group.count + " x " + group.hpEach).join("; ") +
    " | " + (wave.bosses.join(", ") || "-") +
    " | " + (wave.eliteWave ? "yes" : "no") + " / " + (wave.guaranteedModifiers.join(", ") || "none") + " / random " + (wave.randomEliteChance * 100).toFixed(0) + "%" +
    " | " + rarityPool +
    " |\n",
  );
}

process.stdout.write("\n## Scaling\n\n");
process.stdout.write("- Base enemy HP: ceil(enemy.hp * (1 + 0.12 * (wave - 1))).\n");
process.stdout.write("- Spawn interval: max(0.16, 0.52 - 0.025 * wave) seconds.\n");
process.stdout.write("- Random elite chance: 0% before wave 3, then 5% on waves 3-5, 10% on 6-9, and 15% from wave 10.\n");
process.stdout.write("- Base boost rarity weights: common 8, rare 4, epic 2, legendary 1; epic gains 1.5 from wave 5, rare gains 1 from wave 8.\n");
process.stdout.write("- Each rarity cell shows candidate count / summed base offer weight. Locked boosts are excluded; weights omit class preference, build synergy, and recent-offer adjustment.\n");
