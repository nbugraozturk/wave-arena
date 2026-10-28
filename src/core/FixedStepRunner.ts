import type { InputSnapshot } from "./types";

export interface FixedStepRunnerOptions {
  stepSeconds?: number;
  maxFrameDeltaSeconds?: number;
  maxSubSteps?: number;
}

/**
 * Converts render-frame deltas into deterministic simulation ticks.
 * Long pauses are capped to keep the browser responsive after tab suspension.
 */
export class FixedStepRunner {
  readonly stepSeconds: number;
  readonly maxFrameDeltaSeconds: number;
  readonly maxSubSteps: number;
  private accumulator = 0;

  constructor(options: FixedStepRunnerOptions = {}) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? 0.25;
    this.maxSubSteps = options.maxSubSteps ?? Math.ceil(this.maxFrameDeltaSeconds / this.stepSeconds);
    if (!Number.isFinite(this.stepSeconds) || this.stepSeconds <= 0) {
      throw new RangeError("stepSeconds must be a positive finite number");
    }
    if (!Number.isFinite(this.maxFrameDeltaSeconds) || this.maxFrameDeltaSeconds <= 0) {
      throw new RangeError("maxFrameDeltaSeconds must be a positive finite number");
    }
    if (!Number.isInteger(this.maxSubSteps) || this.maxSubSteps < 1) {
      throw new RangeError("maxSubSteps must be a positive integer");
    }
  }

  get interpolationAlpha(): number {
    return Math.min(1, this.accumulator / this.stepSeconds);
  }

  advance(frameDeltaSeconds: number, input: InputSnapshot, tick: (stepSeconds: number, input: InputSnapshot) => void): number {
    if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds <= 0) return 0;
    this.accumulator = Math.min(
      this.accumulator + Math.min(frameDeltaSeconds, this.maxFrameDeltaSeconds),
      this.stepSeconds * this.maxSubSteps,
    );

    let steps = 0;
    const epsilon = this.stepSeconds * 1e-9;
    while (this.accumulator + epsilon >= this.stepSeconds && steps < this.maxSubSteps) {
      tick(this.stepSeconds, input);
      this.accumulator -= this.stepSeconds;
      if (this.accumulator < epsilon) this.accumulator = 0;
      steps += 1;
    }
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
