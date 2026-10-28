import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { runReplay, type ReplayFixture } from "../src/core/replay";

const args = process.argv.slice(2);
const fixturePath = resolve(args.find((argument) => !argument.startsWith("--")) ?? "src/core/fixtures/replay-smoke.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as ReplayFixture;
const actual = runReplay(fixture);

if (args.includes("--update")) {
  writeFileSync(fixturePath, JSON.stringify({ ...fixture, expected: actual }, null, 2) + "\n", "utf8");
  process.stdout.write("Updated replay fixture: " + fixturePath + "\n");
} else if (!fixture.expected || JSON.stringify(actual) !== JSON.stringify(fixture.expected)) {
  process.stderr.write("Replay fixture mismatch for " + fixturePath + "\n");
  process.stderr.write(JSON.stringify(actual, null, 2) + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write(JSON.stringify(actual, null, 2) + "\n");
}
