import test from "node:test";
import assert from "node:assert/strict";

import { Simulation } from "./Simulation";
import type { EnemyActor, PlayerStats, ProjectileActor } from "./types";
import { WORLD } from "./types";
import { vec } from "./math/vec2";

function createSimulation() {
  const simulation = new Simulation({ seed: 90210, maxWaves: 12 });
  simulation.selectClass("vanguard");
  simulation.state.classId = null;
  simulation.state.enemies = [];
  simulation.state.pendingSpawns = [];
  simulation.state.remainingToSpawn = 0;
  return simulation;
}

function makeEnemy(id: number, x: number, y = 800): EnemyActor {
  return {
    id,
    team: "enemy",
    defId: "grunt",
    position: vec.create(x, y),
    velocity: vec.create(),
    radius: 12,
    hp: 100,
    maxHp: 100,
    alive: true,
    contactDamage: 0,
    speed: 0,
    color: "#ffffff",
    hitFlash: 0,
    slowTimer: 0,
    slowAmount: 0,
    ai: "chase",
    fireCooldown: 0,
    orbitSign: 1,
    isBoss: false,
    modifiers: [],
  };
}

function makeProjectile(overrides: Partial<ProjectileActor> = {}): ProjectileActor {
  return {
    id: 100,
    team: "projectile",
    position: vec.create(1500, 800),
    velocity: vec.create(1, 0),
    radius: 4,
    hp: 1,
    maxHp: 1,
    alive: true,
    damage: 20,
    pierceLeft: 0,
    hitIds: [],
    crit: false,
    bouncesLeft: 0,
    explosionRadius: 0,
    hostile: false,
    chargedLifesteal: false,
    ...overrides,
  };
}

function combatMethods(simulation: Simulation) {
  return simulation as unknown as {
    spawnProjectile(direction: { x: number; y: number }, stats: PlayerStats): void;
    fireVolley(): void;
    moveProjectiles(dt: number): void;
    applyBulletHit(projectile: ProjectileActor, enemy: EnemyActor): void;
  };
}

test("combat mechanics work with no class passive active", async (suite) => {
  await suite.test("critical hits use configured chance and multiplier", () => {
    const simulation = createSimulation();
    simulation.state.stats.projectileDamage = 20;
    simulation.state.stats.critChance = 1;
    simulation.state.stats.critMultiplier = 2.5;
    combatMethods(simulation).spawnProjectile({ x: 1, y: 0 }, simulation.state.stats);

    assert.equal(simulation.state.projectiles[0].crit, true);
    assert.equal(simulation.state.projectiles[0].damage, 50);
  });

  await suite.test("pierce carries a projectile through its configured number of additional targets", () => {
    const simulation = createSimulation();
    const first = makeEnemy(1, 1500);
    const second = makeEnemy(2, 1500);
    const projectile = makeProjectile({ pierceLeft: 1 });
    simulation.state.enemies = [first, second];

    combatMethods(simulation).applyBulletHit(projectile, first);
    assert.equal(first.hp, 80);
    assert.equal(projectile.alive, true);
    assert.equal(projectile.pierceLeft, 0);

    combatMethods(simulation).applyBulletHit(projectile, second);
    assert.equal(second.hp, 80);
    assert.equal(projectile.alive, false);
  });

  await suite.test("multishot spawns the configured number of projectiles", () => {
    const simulation = createSimulation();
    simulation.state.stats.projectileCount = 4;
    simulation.state.player.facing = vec.create(1, 0);
    combatMethods(simulation).fireVolley();

    assert.equal(simulation.state.projectiles.length, 4);
    assert.ok(simulation.state.projectiles.every((projectile) => !projectile.hostile));
  });

  await suite.test("ricochet reflects at the world edge and consumes one bounce", () => {
    const simulation = createSimulation();
    const projectile = makeProjectile({
      position: vec.create(2, 800),
      velocity: vec.create(-100, 0),
      bouncesLeft: 1,
    });
    simulation.state.projectiles = [projectile];
    combatMethods(simulation).moveProjectiles(0.1);

    assert.equal(projectile.position.x, projectile.radius);
    assert.equal(projectile.velocity.x, 100);
    assert.equal(projectile.bouncesLeft, 0);
    assert.equal(projectile.alive, true);

    projectile.position.x = WORLD.width - projectile.radius;
    combatMethods(simulation).moveProjectiles(0.1);
    assert.equal(projectile.alive, false);
  });

  await suite.test("explosion damages nearby enemies after the direct hit", () => {
    const simulation = createSimulation();
    const direct = makeEnemy(1, 1500);
    const nearby = makeEnemy(2, 1540);
    const projectile = makeProjectile({ explosionRadius: 80 });
    simulation.state.stats.knockback = 0;
    simulation.state.enemies = [direct, nearby];

    combatMethods(simulation).applyBulletHit(projectile, direct);

    assert.equal(direct.hp, 69);
    assert.equal(nearby.hp, 89);
    assert.equal(projectile.alive, false);
  });

  await suite.test("slow applies the configured amount and duration to hit targets", () => {
    const simulation = createSimulation();
    const enemy = makeEnemy(1, 1500);
    simulation.state.stats.slowDuration = 1.5;
    simulation.state.stats.slowFactor = 0.4;

    combatMethods(simulation).applyBulletHit(makeProjectile(), enemy);

    assert.equal(enemy.slowTimer, 1.5);
    assert.equal(enemy.slowAmount, 0.4);
  });

  await suite.test("lifesteal restores health from projectile damage", () => {
    const simulation = createSimulation();
    const enemy = makeEnemy(1, 1500);
    simulation.state.player.maxHp = 100;
    simulation.state.player.hp = 50;
    simulation.state.stats.lifesteal = 0.25;

    combatMethods(simulation).applyBulletHit(makeProjectile({ damage: 20 }), enemy);

    assert.equal(simulation.state.player.hp, 55);
  });
});
