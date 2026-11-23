#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { evaluateAll, parseJsonl } from '../src/evaluate.js';
import { toConsole, toMarkdown } from '../src/report.js';

const USAGE = `Usage: prompt-eval --rubric <rubric.json> --cases <cases.jsonl> [--out report.md] [--json]

  --rubric   Rubric file with weighted criteria
  --cases    JSONL file, one {id, model, prompt, response, reference?} per line
  --out      Also write a Markdown report to this path
  --json     Print raw JSON results instead of the table
  --strict   Exit with code 1 if any case fails (for CI)`;

const { values } = parseArgs({
  options: {
    rubric: { type: 'string' },
    cases: { type: 'string' },
    out: { type: 'string' },
    json: { type: 'boolean', default: false },
    strict: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.rubric || !values.cases) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}

try {
  const rubric = JSON.parse(readFileSync(values.rubric, 'utf8'));
  const cases = parseJsonl(readFileSync(values.cases, 'utf8'));
  const report = evaluateAll(cases, rubric);

  console.log(values.json ? JSON.stringify(report, null, 2) : toConsole(report));
  if (values.out) {
    writeFileSync(values.out, toMarkdown(report));
    console.log(`\nMarkdown report written to ${values.out}`);
  }
  if (values.strict && report.evaluated.some((e) => !e.pass)) process.exit(1);
} catch (e) {
  console.error(`prompt-eval: ${e.message}`);
  process.exit(2);
}
