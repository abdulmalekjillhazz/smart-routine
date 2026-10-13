import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routineFeatures, predictMissProbability, MODEL_FEATURES } from '../src/index.js';

// Python and JavaScript must give the same answers. The fixtures come from ml/train_pipeline.py.
const here = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(here, '../../ml/artifacts');
const fixturesPath = path.join(artifactsDir, 'parity-fixtures.json');

describe.skipIf(!fs.existsSync(fixturesPath))('Python and JavaScript parity', () => {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const model = JSON.parse(fs.readFileSync(path.join(artifactsDir, `${fixtures.version}.json`), 'utf8'));

  it('uses the same feature list', () => {
    expect(MODEL_FEATURES).toEqual(model.features);
  });

  it('builds the same feature values from a routine', () => {
    for (const c of fixtures.cases) {
      expect(routineFeatures(c.routine, c.weekday)).toEqual(c.features);
    }
  });

  it('predicts the same probability as Python, within 1e-6', () => {
    for (const c of fixtures.cases) {
      const p = predictMissProbability(model, c.features);
      expect(Math.abs(p - c.expected)).toBeLessThan(1e-6);
    }
  });
});
