/**
 * Gate for plan 01-03 Task 3: fails until 01-03-SUMMARY.md documents a successful `supabase db push`.
 * Run: node scripts/verify-supabase-push-evidence.mjs
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const summary = path.join(
  root,
  ".planning",
  "phases",
  "01-foundation-identity",
  "01-03-SUMMARY.md",
);

if (!fs.existsSync(summary)) {
  console.error(
    "Missing .planning/phases/01-foundation-identity/01-03-SUMMARY.md — complete supabase db push and write SUMMARY with evidence.",
  );
  process.exit(1);
}

const text = fs.readFileSync(summary, "utf8");
const hasPush = /supabase\s+db\s+push/i.test(text);
const hasSuccess =
  /exit\s*code\s*[:=]?\s*0/i.test(text) ||
  /\b(success|succeeded|completed\s+ok)\b/i.test(text);

if (!hasPush || !hasSuccess) {
  console.error(
    "01-03-SUMMARY.md must document `supabase db push` and explicit success evidence (e.g. exit code 0).",
  );
  process.exit(1);
}

console.log("Supabase push evidence present in 01-03-SUMMARY.md");
process.exit(0);
