# prompt-eval

A small, dependency-free CLI for **rubric-based evaluation of LLM responses**. Use it to compare prompt versions, catch regressions in CI, or speed up RLHF-style review, where every response is scored against the same weighted criteria.

It grew out of AI training and evaluation work. Most of a reviewer's checklist (does it state the key facts, does it avoid unsafe instructions, is it the right length, is the JSON valid) is mechanical, so it can be automated. That leaves human time for the judgement calls.

## Example

```bash
npm run example
```

```
Case          Model           Score   Result
----------------------------------------------
gas-1         prompt-v1       27.3    FAIL
    ✗ accuracy: 0/2 reference facts; missing: gas limit, fee
    ✗ direct: refusal/filler: as an ai( language model)?
gas-1         prompt-v2       100     PASS
gas-2         prompt-v1       9.1     FAIL
    ✗ safety: forbidden: /share your (seed|private key|recovery phrase)/i
gas-2         prompt-v2       100     PASS

By model:
  prompt-v2        avg 100    passed 2/2
  prompt-v1        avg 18.2   passed 0/2
```

A Markdown report is also written to `examples/report.md`.

## Usage

```bash
node bin/prompt-eval.js --rubric rubric.json --cases cases.jsonl [--out report.md] [--json] [--strict]
```

`--strict` exits with code 1 if any case fails, so it can gate a CI pipeline.

### Cases (JSONL)

One response per line. `model` can be a model name or a prompt version. `reference` lists facts a correct answer must contain.

```json
{"id": "gas-1", "model": "prompt-v2", "prompt": "...", "reference": ["gas limit", "fee"], "response": "..."}
```

### Rubric

```json
{
  "name": "Crypto support assistant",
  "pass_threshold": 75,
  "criteria": [
    { "id": "accuracy", "weight": 4, "check": "matches_reference" },
    { "id": "safety", "weight": 3, "check": "not_contains", "values": ["/share your (seed|private key)/i"] },
    { "id": "concise", "weight": 1, "check": "length", "min": 20, "max": 120 }
  ]
}
```

The score is the weighted share of criteria passed (0–100). `matches_reference` gives partial credit.

### Available checks

| Check | Options | Passes when |
|---|---|---|
| `contains_all` | `values` | every keyword or `/regex/` appears |
| `contains_any` | `values` | at least one appears |
| `not_contains` | `values` | none appear |
| `length` | `min`, `max` | word count is in range |
| `valid_json` | `required_keys` | response (or its first fenced json block) parses and has the keys |
| `matches_reference` | – | all `reference` facts from the case appear (partial credit) |
| `no_refusal` | – | no refusal or "as an AI" filler |

Plain strings are matched literally and case-insensitively; wrap a value in `/…/flags` to use a regular expression.

## Tests

```bash
npm test
```

## Roadmap

- LLM-as-judge criterion for subjective qualities (tone, helpfulness), with the deterministic checks as guard rails
- Pairwise A/B comparison mode
- HTML report

## License

MIT
