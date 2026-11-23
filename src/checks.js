// Deterministic checks used by rubric criteria. Each check returns { pass: boolean, detail: string }.

const words = (text) => (text.trim().match(/\S+/g) || []).length;

function asRegex(pattern) {
  // Accepts "/body/flags" or a plain string (matched case-insensitively, literally).
  const m = /^\/(.+)\/([a-z]*)$/s.exec(pattern);
  if (m) return new RegExp(m[1], m[2]);
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export const CHECKS = {
  /** Response must contain every listed keyword or /regex/. */
  contains_all({ response }, { values }) {
    const missing = values.filter((v) => !asRegex(v).test(response));
    return { pass: missing.length === 0, detail: missing.length ? `missing: ${missing.join(', ')}` : 'all present' };
  },

  /** Response must contain at least one listed keyword or /regex/. */
  contains_any({ response }, { values }) {
    const hit = values.find((v) => asRegex(v).test(response));
    return { pass: Boolean(hit), detail: hit ? `found: ${hit}` : `none of: ${values.join(', ')}` };
  },

  /** Response must not contain any listed keyword or /regex/. */
  not_contains({ response }, { values }) {
    const found = values.filter((v) => asRegex(v).test(response));
    return { pass: found.length === 0, detail: found.length ? `forbidden: ${found.join(', ')}` : 'clean' };
  },

  /** Word count must be within [min, max]. */
  length({ response }, { min = 0, max = Infinity }) {
    const n = words(response);
    return { pass: n >= min && n <= max, detail: `${n} words (allowed ${min}–${max === Infinity ? '∞' : max})` };
  },

  /** Response (or its first ```json block) must parse as JSON, optionally with required keys. */
  valid_json({ response }, { required_keys = [] }) {
    const block = /```(?:json)?\s*([\s\S]*?)```/.exec(response);
    const raw = block ? block[1] : response;
    let data;
    try { data = JSON.parse(raw); } catch (e) { return { pass: false, detail: `invalid JSON: ${e.message}` }; }
    const missing = required_keys.filter((k) => !(data && typeof data === 'object' && k in data));
    return { pass: missing.length === 0, detail: missing.length ? `missing keys: ${missing.join(', ')}` : 'valid JSON' };
  },

  /** Every expected fact from the test case's `reference` list must appear in the response. */
  matches_reference({ response, reference = [] }) {
    const facts = Array.isArray(reference) ? reference : [reference];
    const missing = facts.filter((f) => !asRegex(String(f)).test(response));
    const hit = facts.length - missing.length;
    return { pass: missing.length === 0, detail: `${hit}/${facts.length} reference facts${missing.length ? `; missing: ${missing.join(', ')}` : ''}`, ratio: facts.length ? hit / facts.length : 1 };
  },

  /** Flags common refusal / filler phrases when the task should be answered directly. */
  no_refusal({ response }) {
    const patterns = [/as an ai( language model)?/i, /i (can(no|')t|am unable to) (help|assist)/i, /i'm sorry, but/i];
    const hit = patterns.find((p) => p.test(response));
    return { pass: !hit, detail: hit ? `refusal/filler: ${hit.source}` : 'direct answer' };
  },
};

export function runCheck(type, testCase, options = {}) {
  const fn = CHECKS[type];
  if (!fn) throw new Error(`Unknown check type "${type}". Available: ${Object.keys(CHECKS).join(', ')}`);
  return fn(testCase, options);
}
