# Unity Port Contract

This file is the single normative contract for a Unity port. The TypeScript core remains the behavior reference until a port passes the same replay fixtures. Implement the core as plain C# data and logic; Unity objects, time, input, rendering, and audio stay in the adapter.

## Runtime boundaries

- Port rules from src/core. Replace src/web with Unity adapters.
- Keep the simulation independent from MonoBehaviour, GameObject, Transform, UnityEngine.Time, and Unity input APIs.
- Use IEEE-754 double precision for gameplay values. JavaScript number is a 64-bit float; float fields can change collision, movement, and replay results.
- Preserve collection ordering. RNG consumption and ordered traversal are part of the deterministic contract.
- World positions and velocities use world units and seconds.

## Coordinate and view contract

- WORLD is 2880 by 1620 world units.
- VIEW is 960 by 540 world units.
- Player and enemy positions are world-space. Camera transforms affect rendering only.
- Input aim coordinates are world-space. Convert screen or pointer positions through the camera before creating an InputSnapshot.
- Keep the viewport aspect ratio and camera framing separate from simulation state.

## DTO mapping

| TypeScript contract | Unity-side representation | Notes |
| --- | --- | --- |
| GameConfig | GameConfig DTO | Seed, maxWaves, mutators, run modifiers, Ascension, and challenge data. |
| GameState | GameState DTO | Plain serializable data. Preserve phase strings and array ordering. |
| PlayerActor | Player DTO | Position, velocity, facing, HP, alive flag, and color. |
| EnemyActor | Enemy DTO | Includes definition ID, AI string, modifiers, timers, shields, and optional behaviors. |
| ProjectileActor | Projectile DTO | Includes velocity, damage, hit IDs, pierce, bounces, explosion, hostile, and charged lifesteal fields. |
| BoostDef / EnemyDef / ArtifactDef | Content DTO or ScriptableObject data | Runtime rules consume stable IDs; ScriptableObjects are an adapter choice only. |
| Vec2 | Two-number value type | X and Y use world units. |
| GamePhase / StrategicPhase / NodeType | Exact string enums | Do not rename serialized values. |
| InputSnapshot | InputSnapshot DTO | One immutable snapshot is supplied to each simulation tick. |

Keep JSON property names camelCase when exchanging save or replay data. Optional properties may be absent; absent values must retain the TypeScript defaults.

## InputSnapshot

| Field | Required | Contract |
| --- | --- | --- |
| moveX, moveY | Yes | Movement axes. The simulation normalizes the pair before movement. |
| aimX, aimY | No | Absolute world-space aim point. Missing values behave as zero. |
| firing | No | Preferred fire field. |
| shoot | No | Legacy alias; used only when firing is absent. |
| ult | Yes | Held state. Simulation detects the rising edge through GameState.ultWasDown. |

Sample input:
```json
{
  "moveX": 0,
  "moveY": -1,
  "aimX": 1800,
  "aimY": 810,
  "firing": true,
  "ult": false
}
```

Read device state in the adapter and pass only this snapshot into the simulation. If one render frame produces multiple fixed ticks, the sampled snapshot is reused for each of those ticks.

## Fixed-step runner

- Fixed simulation step: 1 / 60 second.
- Maximum accepted render-frame delta: 0.25 seconds.
- Maximum catch-up ticks: 15 per render frame.
- Negative, zero, or non-finite frame deltas produce no simulation ticks.
- Time beyond the frame-delta cap is discarded. This prevents a long background-tab pause from creating an unbounded catch-up loop.
- Reset the accumulator when replacing or restarting a run.
- Render once per display frame; simulation may tick zero, one, or multiple times.

Headless replays bypass render timing and call Simulation.tick once for every recorded tick with dt = 1 / 60.

## Tick order

Preserve this order exactly:

1. Clear audio cues for this tick.
2. If the phase is not combat, update visual effects and return.
3. Clamp dt to at most 1 / 20 second; advance run and wave time.
4. Decay shake and player contact cooldown.
5. If hitstop is active, advance effects and hit flashes, then return.
6. Aim player.
7. Move player.
8. Collect pickups.
9. Regenerate health.
10. Process ultimate input.
11. Update active ultimate effects.
12. Fire player weapons.
13. Spawn pending enemies.
14. Move enemies.
15. Move projectiles.
16. Resolve projectile, contact, and enemy-projectile hits.
17. Remove dead actors.
18. Update visual effects.
19. Decay hit flashes.
20. Check defeat, wave completion, reward, and run completion.

Do not move wave-completion or RNG-consuming work across these boundaries. A tick can return early during non-combat phases or hitstop.

## RNG contract

Use the seeded Mulberry32 algorithm in src/core/rng.ts. State is an unsigned 32-bit integer. All additions and multiplications wrap modulo 2^32; multiplication uses the low 32 bits. Snapshot and restore must preserve the exact continuation.

```text
state = uint32(state + 0x6d2b79f5)
t = int32(state)
t = imul(t xor (t unsigned-shift-right 15), t or 1)
t = int32(t xor int32(t + imul(t xor (t unsigned-shift-right 7), t or 61)))
result = uint32(t xor (t unsigned-shift-right 14))
return result / 4294967296
```

- int32 and uint32 conversions preserve the low 32 bits; arithmetic is unchecked.
- int(maxExclusive) is floor(next() * maxExclusive).
- pick(items) uses that integer index.
- shuffle(items) is Fisher-Yates, iterating from length - 1 down to 1.
- Do not use Unity random APIs, System.Random, wall-clock values, or unordered collection iteration for gameplay choices.
- Preserve catalog array order and the order in which random draws are requested.

## Save data

### Profile v1

Profile JSON has version 1 and these fields:

- legacyShards, runsCompleted, bestWave
- unlockedClasses
- achievements
- optional masteryXp, unlockedBoosts, and unlockedEnemyVariants

Unknown IDs are filtered during normalization. Missing optional progression fields default to empty arrays or zero. Unsupported profile versions are rejected.

### Run v2

Run JSON has version 2 and this shape:

```json
{
  "version": 2,
  "state": {},
  "rngState": 123456789,
  "contactTimer": 0
}
```

The state DTO is the serialized GameState. rngState is an unsigned 32-bit RNG snapshot. contactTimer is a number of seconds. Parse and normalize into a temporary value; only replace the live run after the payload is accepted. Valid legacy payloads may be normalized to this shape.

## Replay fixture format

A replay fixture stores the run setup, compressed fixed-tick input sequence, and expected state summary.

```json
{
  "version": 1,
  "seed": 24681357,
  "maxWaves": 12,
  "classId": "marksman",
  "frames": [
    {
      "ticks": 120,
      "input": {
        "moveX": 0,
        "moveY": 0,
        "aimX": 1900,
        "aimY": 810,
        "firing": true,
        "ult": false
      }
    }
  ],
  "expected": {}
}
```

The expected summary has these fields:

| Field | Meaning |
| --- | --- |
| version, seed, classId | Summary schema and run identity. |
| ticks, phase, time | Executed fixed ticks and resulting run phase/time. |
| waveIndex, level, kills | Progression summary. |
| player | Position, current HP, and maximum HP. |
| appliedBoostIds | Ordered selected boost IDs. |
| enemies, projectiles | Ordered, summarized live actors. |
| rngState | Unsigned 32-bit RNG snapshot. |

The checked-in src/core/fixtures/replay-smoke.json contains the complete canonical example. Positions, HP, damage, and time are rounded to six decimal places. Preserve entity array order. Same seed, configuration, tick count, and inputs must produce a byte-for-byte equal summary JSON.

Run npm run replay:fixture to verify the fixture. To intentionally refresh it, run npm run replay:fixture:update.

## Port acceptance

A Unity implementation is ready for comparison when it:

1. Maps the DTOs and exact string IDs without introducing Unity types into the simulation.
2. Uses the same 1/60 fixed step and tick order.
3. Restores Profile v1 and Run v2 with no progression or RNG continuation loss.
4. Produces the checked-in replay summary for the same seed and inputs.
5. Produces the same summary at 30, 60, and 120 render frames per second.
