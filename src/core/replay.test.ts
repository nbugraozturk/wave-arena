import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runReplay, type ReplayFixture } from "./replay";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/replay-smoke.json", import.meta.url), "utf8"),
) as ReplayFixture;

test("the replay fixture matches its checked-in summary and repeated runs", () => {
  const first = runReplay(fixture);
  const second = runReplay(fixture);
  assert.deepEqual(first, second);
  assert.ok(fixture.expected);
  assert.deepEqual(first, fixture.expected);
});
