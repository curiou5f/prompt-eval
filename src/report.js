// Renders evaluation results as a terminal table or a Markdown report.

const pad = (s, n) => String(s).padEnd(n);

export function toConsole(report) {
  const lines = [`Rubric: ${report.rubric}`, ''];
  lines.push(pad('Case', 14) + pad('Model', 16) + pad('Score', 8) + 'Result');
  lines.push('-'.repeat(46));
  for (const e of report.evaluated) {
    lines.push(pad(e.id, 14) + pad(e.model, 16) + pad(e.score, 8) + (e.pass ? 'PASS' : 'FAIL'));
    for (const r of e.results.filter((x) => !x.pass)) lines.push(`    ✗ ${r.id}: ${r.detail}`);
  }
  lines.push('', 'By model:');
  for (const m of report.summary) lines.push(`  ${pad(m.model, 16)} avg ${pad(m.avgScore, 6)} passed ${m.passed}/${m.cases}`);
  if (report.topFailures.length) {
    lines.push('', 'Most failed criteria:');
    for (const f of report.topFailures) lines.push(`  ${pad(f.id, 22)} ${f.count}x`);
  }
  return lines.join('\n');
}

export function toMarkdown(report) {
  const out = [`# Evaluation report: ${report.rubric}`, ''];
  out.push('## Summary', '', '| Model | Cases | Passed | Avg score |', '|---|---:|---:|---:|');
  for (const m of report.summary) out.push(`| ${m.model} | ${m.cases} | ${m.passed} | ${m.avgScore} |`);
  if (report.topFailures.length) {
    out.push('', '## Most failed criteria', '', '| Criterion | Failures |', '|---|---:|');
    for (const f of report.topFailures) out.push(`| ${f.id} | ${f.count} |`);
  }
  out.push('', '## Cases', '');
  for (const e of report.evaluated) {
    out.push(`### ${e.id} (${e.model}): ${e.score} ${e.pass ? '✅' : '❌'}`, '', '| Criterion | Weight | Result | Detail |', '|---|---:|---|---|');
    for (const r of e.results) out.push(`| ${r.id} | ${r.weight} | ${r.pass ? 'pass' : 'fail'} | ${r.detail.replace(/\|/g, '\\|')} |`);
    out.push('');
  }
  return out.join('\n');
}
