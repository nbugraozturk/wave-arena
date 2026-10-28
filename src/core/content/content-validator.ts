import { BOOSTS, buildWaves, ENEMIES } from "./catalog";
import { ACHIEVEMENTS } from "./achievements";
import { CLASSES } from "./classes";
import { MUTATORS } from "./mutators";
import { WAVE_PICKUPS } from "./pickups";
import { ARTIFACTS, BOUNTIES, BOSS_REWARDS, createShopInventory, ENEMY_MODIFIERS, EVENTS, FUSION_RECIPES, PACTS, TEMPORARY_EFFECTS } from "./strategic";
import { UNLOCKS } from "./unlocks";
import { RUN_MODIFIERS } from "./run-modifiers";
import type { ArtifactDef, BoostDef, ClassDef, EnemyDef, EventDef, FusionRecipe, UnlockDef, WaveDef } from "../types";

export interface ContentCatalog {
  boosts: readonly BoostDef[];
  classes: readonly ClassDef[];
  enemies: Readonly<Record<string, EnemyDef>>;
  artifacts: readonly ArtifactDef[];
  unlocks: readonly UnlockDef[];
  fusionRecipes: readonly FusionRecipe[];
  events: readonly EventDef[];
  waves: readonly WaveDef[];
  additionalCollections: readonly { name: string; items: readonly { id: string }[] }[];
}

export interface ContentIssue {
  code: string;
  path: string;
  message: string;
}

export function createDefaultContentCatalog(maxWaves = 40): ContentCatalog {
  return {
    boosts: BOOSTS,
    classes: CLASSES,
    enemies: ENEMIES,
    artifacts: ARTIFACTS,
    unlocks: UNLOCKS,
    fusionRecipes: FUSION_RECIPES,
    events: EVENTS,
    waves: buildWaves(maxWaves),
    additionalCollections: [
      { name: "achievements", items: ACHIEVEMENTS },
      { name: "bounties", items: BOUNTIES },
      { name: "bossRewards", items: BOSS_REWARDS },
      { name: "enemyModifiers", items: Object.keys(ENEMY_MODIFIERS).map((id) => ({ id })) },
      { name: "mutators", items: MUTATORS },
      { name: "runModifiers", items: Object.values(RUN_MODIFIERS) },
      { name: "wavePickups", items: WAVE_PICKUPS },
      { name: "pacts", items: PACTS },
      { name: "temporaryEffects", items: TEMPORARY_EFFECTS },
    ],
  };
}

export function validateContentCatalog(catalog: ContentCatalog = createDefaultContentCatalog()): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const report = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const uniqueIds = (items: readonly { id: string }[], path: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) report("duplicate_id", path + "." + item.id, "Duplicate content ID.");
      seen.add(item.id);
    }
  };

  uniqueIds(catalog.boosts, "boosts");
  uniqueIds(catalog.classes, "classes");
  uniqueIds(catalog.artifacts, "artifacts");
  uniqueIds(catalog.unlocks, "unlocks");
  uniqueIds(catalog.fusionRecipes, "fusionRecipes");
  uniqueIds(catalog.events, "events");
  for (const collection of catalog.additionalCollections) uniqueIds(collection.items, collection.name);

  const boostIds = new Set(catalog.boosts.map((boost) => boost.id));
  const artifactIds = new Set(catalog.artifacts.map((artifact) => artifact.id));
  const unlockById = new Map(catalog.unlocks.map((unlock) => [unlock.id, unlock]));
  const enemyIds = new Set<string>();

  for (const [key, enemy] of Object.entries(catalog.enemies)) {
    if (enemyIds.has(enemy.id)) report("duplicate_id", "enemies." + enemy.id, "Duplicate enemy ID.");
    enemyIds.add(enemy.id);
    if (enemy.id !== key) report("enemy_key_mismatch", "enemies." + key, "Enemy ID must match its catalog key.");
    if (enemy.splitOnDeath && !Object.hasOwn(catalog.enemies, enemy.splitOnDeath.enemyId)) {
      report("unknown_enemy", "enemies." + key + ".splitOnDeath.enemyId", "Unknown split enemy: " + enemy.splitOnDeath.enemyId);
    }
  }

  for (const boost of catalog.boosts) {
    if (boost.unlockRequired && !unlockById.has(boost.unlockRequired)) {
      report("unknown_unlock", "boosts." + boost.id + ".unlockRequired", "Unknown unlock: " + boost.unlockRequired);
    }
  }

  for (const cls of catalog.classes) {
    for (const boostId of cls.preferredBoostIds) {
      if (!boostIds.has(boostId)) {
        report("unknown_boost", "classes." + cls.id + ".preferredBoostIds", "Unknown preferred boost: " + boostId);
      }
    }
  }

  for (const unlock of catalog.unlocks) {
    if (unlock.kind === "boost" && !boostIds.has(unlock.id)) {
      report("unknown_boost", "unlocks." + unlock.id, "Boost unlock does not target a catalog boost.");
    }
  }

  for (const recipe of catalog.fusionRecipes) {
    const path = "fusionRecipes." + recipe.id;
    if (recipe.ingredients.length === 0) report("impossible_recipe", path + ".ingredients", "Fusion recipe must consume at least one boost.");
    if (Boolean(recipe.resultBoostId) === Boolean(recipe.resultArtifactId)) {
      report("impossible_recipe", path, "Fusion recipe must define exactly one result.");
    }
    if (!Number.isInteger(recipe.cost.evolutionShards) || recipe.cost.evolutionShards < 0) {
      report("impossible_recipe", path + ".cost.evolutionShards", "Fusion shard cost must be a non-negative integer.");
    }
    const counts = new Map<string, number>();
    for (const ingredientId of recipe.ingredients) {
      counts.set(ingredientId, (counts.get(ingredientId) ?? 0) + 1);
      const ingredient = catalog.boosts.find((boost) => boost.id === ingredientId);
      if (!ingredient) {
        report("unknown_boost", path + ".ingredients", "Unknown fusion ingredient: " + ingredientId);
      } else if (ingredient.category === "ult") {
        report("impossible_recipe", path + ".ingredients", "Ultimate boost cannot be offered as a fusion ingredient: " + ingredientId);
      }
    }
    for (const [ingredientId, count] of counts) {
      const ingredient = catalog.boosts.find((boost) => boost.id === ingredientId);
      if (ingredient && count > (ingredient.maxCopies ?? 6)) {
        report("impossible_recipe", path + ".ingredients", "Recipe needs more copies than can be owned: " + ingredientId);
      }
    }
    if (recipe.resultBoostId && !boostIds.has(recipe.resultBoostId)) {
      report("unknown_boost", path + ".resultBoostId", "Unknown fusion result boost: " + recipe.resultBoostId);
    }
    if (recipe.resultArtifactId && !artifactIds.has(recipe.resultArtifactId)) {
      report("unknown_artifact", path + ".resultArtifactId", "Unknown fusion result artifact: " + recipe.resultArtifactId);
    }
  }

  for (const event of catalog.events) {
    uniqueIds(event.choices, "events." + event.id + ".choices");
    if (event.choices.length === 0) report("empty_event", "events." + event.id + ".choices", "Event must offer at least one choice.");
    for (const choice of event.choices) {
      const artifactId = choice.effect.artifactId;
      if (artifactId && !artifactIds.has(artifactId)) {
        report("unknown_artifact", "events." + event.id + ".choices." + choice.id, "Unknown event reward artifact: " + artifactId);
      }
    }
  }

  for (const item of createShopInventory()) {
    if (item.artifactId && !artifactIds.has(item.artifactId)) {
      report("unknown_artifact", "shop." + item.id + ".artifactId", "Unknown shop artifact: " + item.artifactId);
    }
  }

  for (const wave of catalog.waves) {
    for (const group of wave.groups) {
      if (!enemyIds.has(group.enemyId)) {
        report("unknown_enemy", "waves." + wave.index + ".groups", "Unknown wave enemy: " + group.enemyId);
      }
      if (!Number.isInteger(group.count) || group.count <= 0) {
        report("invalid_wave_count", "waves." + wave.index + ".groups." + group.enemyId, "Wave group count must be a positive integer.");
      }
    }
  }

  return issues.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
}
