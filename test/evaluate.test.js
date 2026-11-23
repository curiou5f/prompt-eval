import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCheck } from '../src/checks.js';
import { evaluateCase, evaluateAll, parseJsonl } from '../src/evaluate.js';
import { toMarkdown } from '../src/report.js';

const c = (response, extra = {}) => ({ response, ...extra });

test('contains_all / contains_any / not_contains support plain text and /regex/', () => {
  assert.equal(runCheck('contains_all', c('Gas Limit too low'), { values: ['gas limit', '/too\\s+low/'] }).pass, true);
  assert.equal(runCheck('contains_all', c('gas limit'), { values: ['gas limit', 'nonce'] }).pass, false);
  assert.equal(runCheck('contains_any', c('please resubmit'), { values: ['speed up', 'resubmit'] }).pass, true);
  assert.equal(runCheck('not_contains', c('share your seed phrase'), { values: ['/share your seed/i'] }).pass, false);
});

test('plain strings are matched literally, not as regex', () => {
  assert.equal(runCheck('contains_all', c('cost is $5'), { values: ['$5'] }).pass, true);
  assert.equal(runCheck('contains_all', c('a.b'), { values: ['a.b'] }).pass, true);
  assert.equal(runCheck('contains_all', c('axb'), { values: ['a.b'] }).pass, false);
});

test('length counts words', () => {
  assert.equal(runCheck('length', c('one two three'), { min: 2, max: 3 }).pass, true);
  assert.equal(runCheck('length', c('one'), { min: 2 }).pass, false);
});

test('valid_json reads fenced blocks and required keys', () => {
  const ok = c('Here:\n```json\n{"symbol":"BTC","side":"long"}\n```');
  assert.equal(runCheck('valid_json', ok, { required_keys: ['symbol', 'side'] }).pass, true);
  assert.equal(runCheck('valid_json', ok, { required_keys: ['size'] }).pass, false);
  assert.equal(runCheck('valid_json', c('{bad json')).pass, false);
});

test('matches_reference gives partial credit', () => {
  const r = runCheck('matches_reference', c('the gas limit was low', { reference: ['gas limit', 'fee'] }));
  assert.equal(r.pass, false);
  assert.equal(r.ratio, 0.5);
});

test('unknown check type is a clear error', () => {
  assert.throws(() => runCheck('vibes', c('x')), /Unknown check type "vibes"/);
});

test('evaluateCase computes a weighted score', () => {
  const rubric = {
    pass_threshold: 60,
    criteria: [
      { id: 'a', weight: 3, check: 'contains_all', values: ['yes'] },
      { id: 'b', weight: 1, check: 'contains_all', values: ['no'] },
    ],
  };
  const e = evaluateCase({ id: 't', response: 'yes' }, rubric);
  assert.equal(e.score, 75);
  assert.equal(e.pass, true);
});

test('example data: prompt-v2 beats prompt-v1 and safety failure is detected', () => {
  const rubric = JSON.parse(readFileSync(new URL('../examples/rubric.json', import.meta.url), 'utf8'));
  const cases = parseJsonl(readFileSync(new URL('../examples/cases.jsonl', import.meta.url), 'utf8'));
  const report = evaluateAll(cases, rubric);
  assert.equal(report.summary[0].model, 'prompt-v2');
  assert.equal(report.summary[0].passed, 2);
  const unsafe = report.evaluated.find((e) => e.id === 'gas-2' && e.model === 'prompt-v1');
  assert.equal(unsafe.results.find((r) => r.id === 'safety').pass, false);
  assert.match(toMarkdown(report), /\| prompt-v2 \| 2 \| 2 \|/);
});

test('parseJsonl reports the failing line number', () => {
  assert.throws(() => parseJsonl('{"a":1}\n{oops}'), /Line 2/);
});
