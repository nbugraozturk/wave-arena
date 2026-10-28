import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultContentCatalog, validateContentCatalog } from "./content-validator";

test("the production content catalog has no integrity issues", () => {
  assert.deepEqual(validateContentCatalog(), []);
});

test("content validation reports duplicate IDs, unknown references, and impossible recipes", () => {
  const base = createDefaultContentCatalog(3);
  const limitedBoost = { ...base.boosts[0], id: "limited", maxCopies: 1 };
  const badBoost = { ...base.boosts[1], id: "requires-missing-unlock", unlockRequired: "missing-unlock" };
  const catalog = {
    ...base,
    boosts: [...base.boosts, base.boosts[0], limitedBoost, badBoost],
    enemies: {
      ...base.enemies,
      custom: { ...base.enemies.grunt, id: "custom", splitOnDeath: { enemyId: "missing-enemy", count: 2 } },
    },
    fusionRecipes: [
      ...base.fusionRecipes,
      {
        id: "broken-recipe",
        ingredients: ["limited", "limited", "missing-boost"],
        resultArtifactId: "missing-artifact",
        cost: { evolutionShards: 0 },
        description: "invalid fixture",
      },
    ],
    events: [
      ...base.events,
      {
        id: "broken-event",
        name: "Broken",
        description: "",
        choices: [{ id: "broken-choice", label: "", description: "", effect: { artifactId: "missing-artifact" } }],
      },
    ],
    waves: [
      ...base.waves,
      { index: 4, groups: [{ enemyId: "missing-wave-enemy", count: 1 }], spawnInterval: 0.2 },
    ],
  };

  const codes = new Set(validateContentCatalog(catalog).map((issue) => issue.code));
  assert.ok(codes.has("duplicate_id"));
  assert.ok(codes.has("unknown_unlock"));
  assert.ok(codes.has("unknown_enemy"));
  assert.ok(codes.has("unknown_boost"));
  assert.ok(codes.has("unknown_artifact"));
  assert.ok(codes.has("impossible_recipe"));
});
