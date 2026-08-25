import assert from "node:assert/strict";
import test from "node:test";
import { Simulation } from "./Simulation";
import { WORLD } from "./types";

test("enemies outside the world are returned to the playable area", () => {
    const simulation = new Simulation({ seed: 1, maxWaves: 1 });
    simulation.selectClass("vanguard");
    simulation.state.pendingSpawns = [];
    simulation.state.enemies = [
        {
            id: 99,
            team: "enemy",
            defId: "stalker",
            position: { x: WORLD.width + 100, y: WORLD.height + 100 },
            velocity: { x: 0, y: 0 },
            radius: 12,
            hp: 10,
            maxHp: 10,
            alive: true,
            contactDamage: 0,
            speed: 0,
            color: "#fff",
            hitFlash: 0,
            slowTimer: 0,
            slowAmount: 0,
            ai: "orbit",
            fireCooldown: 0,
            orbitSign: 1,
            isBoss: false,
            modifiers: [],
            shield: 0,
        },
    ];

    simulation.tick(0.01, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false, ult: false });

    const enemy = simulation.state.enemies[0]!;
    assert.equal(enemy.position.x, WORLD.width - enemy.radius);
    assert.equal(enemy.position.y, WORLD.height - enemy.radius);
});