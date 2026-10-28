import test from "node:test";
import assert from "node:assert/strict";

import { FixedStepRunner } from "./FixedStepRunner";
import { Simulation } from "./Simulation";

const input = { moveX: 0.35, moveY: -0.8, aimX: 2100, aimY: 780, firing: true, ult: false };

function simulateAtRenderRate(framesPerSecond: number): string {
  const simulation = new Simulation({ seed: 424242, maxWaves: 12 });
  simulation.selectClass("marksman");
  const runner = new FixedStepRunner();
  for (let frame = 0; frame < framesPerSecond * 12; frame += 1) {
    runner.advance(1 / framesPerSecond, input, (step, snapshot) => simulation.tick(step, snapshot));
  }
  return simulation.saveRun();
}

test("fixed-step simulation stays identical at 30, 60, and 120 render FPS", () => {
  assert.equal(simulateAtRenderRate(30), simulateAtRenderRate(60));
  assert.equal(simulateAtRenderRate(60), simulateAtRenderRate(120));
});

test("fixed-step runner caps pause catch-up and ignores invalid frame deltas", () => {
  const runner = new FixedStepRunner();
  let count = 0;
  const tick = () => { count += 1; };
  assert.equal(runner.advance(1 / 30, input, tick), 2);
  assert.equal(runner.advance(5, input, tick), 15);
  assert.equal(runner.advance(Number.NaN, input, tick), 0);
  assert.equal(runner.advance(-1, input, tick), 0);
  assert.equal(count, 17);
});
