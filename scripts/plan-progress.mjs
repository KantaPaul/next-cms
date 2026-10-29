#!/usr/bin/env node
// Usage: node scripts/plan-progress.mjs [path-to-plan.md]
// Reads the `todos` in the plan's frontmatter and rewrites the block between
// <!-- progress:start --> and <!-- progress:end --> with a table and a Mermaid pie chart.
import { readFileSync, writeFileSync } from "node:fs";

const file =
  process.argv[2] ?? ".cursor/plans/custom_builder_engine_refs.plan.md";

const SECTIONS = [
  ["Engine (ENG)", 680, 710],
  ["Editor UX (UXE)", 711, 736],
  ["Data saving (DAT)", 737, 754],
  ["Packages (PKG)", 755, 772],
  ["Extension API (EXT)", 773, 795],
  ["Robustness (ROB)", 796, 812],
];

const text = readFileSync(file, "utf8");
const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fm) throw new Error("No frontmatter found in " + file);

// Collect { id, status } pairs from the todos list.
const todos = [];
let current = null;
for (const line of fm[1].split(/\r?\n/)) {
  const id = line.match(/^\s*-\s*id:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/);
  if (id) { current = { id: id[1], status: "pending" }; todos.push(current); continue; }
  const st = line.match(/^\s+status:\s*["']?(\w+)["']?\s*$/);
  if (st && current) current.status = st[1];
}
if (todos.length === 0) throw new Error("No todos found in frontmatter");

const num = (id) => Number(id.replace(/\D/g, ""));
const count = (list) => ({
  total: list.length,
  done: list.filter((t) => t.status === "completed").length,
  doing: list.filter((t) => t.status === "in_progress").length,
  todo: list.filter((t) => !["completed", "in_progress"].includes(t.status)).length,
});
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0") + "%";
const bar = (a, b, w = 20) => {
  const f = b ? Math.round((a / b) * w) : 0;
  return "█".repeat(f) + "░".repeat(w - f);
};

const all = count(todos);
const rows = SECTIONS.map(([name, a, b]) => {
  const c = count(todos.filter((t) => num(t.id) >= a && num(t.id) <= b));
  return `| ${name} | R${a}–R${b} | ${c.total} | ${c.done} | ${c.doing} | ${c.todo} | ${pct(c.done, c.total)} | \`${bar(c.done, c.total, 10)}\` |`;
});

const block = [
  "<!-- progress:start -->",
  "## Progress",
  "",
  `Updated ${new Date().toISOString().slice(0, 10)} by \`scripts/plan-progress.mjs\`. Do not edit this block by hand.`,
  "",
  `**${all.done} of ${all.total} completed (${pct(all.done, all.total)})** · ${all.doing} in progress · ${all.todo} pending`,
  "",
  `\`${bar(all.done, all.total, 30)}\` ${pct(all.done, all.total)}`,
  "",
  "| Section | Refs | Total | Done | In progress | Pending | % done | Bar |",
  "|---|---|---|---|---|---|---|---|",
  ...rows,
  `| **Total** | | **${all.total}** | **${all.done}** | **${all.doing}** | **${all.todo}** | **${pct(all.done, all.total)}** | \`${bar(all.done, all.total, 10)}\` |`,
  "",
  "```mermaid",
  "pie showData title Todos by status",
  `  "Completed" : ${all.done}`,
  `  "In progress" : ${all.doing}`,
  `  "Pending" : ${all.todo}`,
  "```",
  "<!-- progress:end -->",
].join("\n");

const re = /<!-- progress:start -->[\s\S]*?<!-- progress:end -->/;
let out;
if (re.test(text)) out = text.replace(re, block);
else {
  // First run: insert right after the frontmatter.
  const end = fm[0].length;
  out = text.slice(0, end) + "\n\n" + block + "\n" + text.slice(end);
}
writeFileSync(file, out);
console.log(`${file}: ${all.done}/${all.total} completed (${pct(all.done, all.total)})`);
