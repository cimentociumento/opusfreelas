#!/usr/bin/env node
/**
 * Checks 01-03-SUMMARY.md for documented supabase db push success (exit 0).
 * Exits 1 until evidence is present — expected before Task 3 completes.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const summaryPath = join(
  root,
  ".planning",
  "phases",
  "01-foundation-identity",
  "01-03-SUMMARY.md"
);

if (!existsSync(summaryPath)) {
  console.error("Missing 01-03-SUMMARY.md");
  process.exit(1);
}

const text = readFileSync(summaryPath, "utf8");
// Human fills this single line only after a real push + table check (avoids false positives from templates).
const verified = /^PUSH_VERIFIED=true\s*$/m.test(text);

if (!verified) {
  console.error(
    "01-03-SUMMARY.md must contain the line PUSH_VERIFIED=true after Task 3 (supabase db push + table check)."
  );
  process.exit(1);
}

console.log("Supabase push evidence present in 01-03-SUMMARY.md");
process.exit(0);
