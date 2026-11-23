import { runCheck } from './checks.js';

/**
 * Scores one test case against a rubric.
 * rubric = { name, pass_threshold, criteria: [{ id, description, weight, check, ...options }] }
 * Returns a weighted score from 0 to 100 plus per-criterion results.
 */
export function evaluateCase(testCase, rubric) {
  const totalWeight = rubric.criteria.reduce((s, c) => s + (c.weight ?? 1), 0);
  let earned = 0;
  const results = rubric.criteria.map((c) => {
    const weight = c.weight ?? 1;
    const r = runCheck(c.check, testCase, c);
    // Partial credit for checks that report a ratio (e.g. reference facts), full/none otherwise.
    const credit = typeof r.ratio === 'number' ? r.ratio : r.pass ? 1 : 0;
    earned += credit * weight;
    return { id: c.id, description: c.description, weight, pass: r.pass, credit, detail: r.detail };
  });
  const score = totalWeight ? Math.round((earned / totalWeight) * 1000) / 10 : 0;
  const threshold = rubric.pass_threshold ?? 70;
  return { id: testCase.id, model: testCase.model ?? 'unknown', score, pass: score >= threshold, results };
}

/** Evaluates all cases and aggregates by model. */
export function evaluateAll(cases, rubric) {
  const evaluated = cases.map((c) => evaluateCase(c, rubric));
  const byModel = {};
  for (const e of evaluated) {
    const m = (byModel[e.model] ??= { model: e.model, cases: 0, passed: 0, total: 0 });
    m.cases++;
    m.total += e.score;
    if (e.pass) m.passed++;
  }
  const summary = Object.values(byModel)
    .map((m) => ({ model: m.model, cases: m.cases, passed: m.passed, avgScore: Math.round((m.total / m.cases) * 10) / 10 }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Which criteria fail most often: useful for deciding what to fix in the prompt.
  const failures = {};
  for (const e of evaluated) for (const r of e.results) if (!r.pass) failures[r.id] = (failures[r.id] ?? 0) + 1;
  const topFailures = Object.entries(failures).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));

  return { rubric: rubric.name, evaluated, summary, topFailures };
}

/** Parses JSONL (one JSON object per line, blank lines and // comments ignored). */
export function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((line, i) => [line.trim(), i + 1])
    .filter(([line]) => line && !line.startsWith('//'))
    .map(([line, n]) => {
      try { return JSON.parse(line); } catch (e) { throw new Error(`Line ${n}: ${e.message}`); }
    });
}
