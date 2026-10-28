import { validateContentCatalog } from "../src/core/content/content-validator";

const issues = validateContentCatalog();
if (issues.length > 0) {
  process.stderr.write("Content integrity failed with " + issues.length + " issue(s):\n");
  for (const issue of issues) {
    process.stderr.write("- [" + issue.code + "] " + issue.path + ": " + issue.message + "\n");
  }
  process.exitCode = 1;
} else {
  process.stdout.write("Content integrity: OK\n");
}
