import { Router } from 'express';
import { activeModel } from '../services/mlRegistry.js';

// Public: the browser needs the weights to predict locally, so they work offline.
// Contains no personal data: only weights and aggregate evaluation numbers.
export function modelRouter() {
  const r = Router();

  r.get('/current', async (req, res, next) => {
    try {
      const m = await activeModel();
      if (!m) return res.status(404).json({ error: { code: 'NOT_FOUND', message: { en: 'No model is active.', bn: 'কোনো মডেল চালু নেই।' }, requestId: req.id } });

      res.set('ETag', `"${m.artifactSha256}"`);
      res.set('Cache-Control', 'public, max-age=3600');
      if (req.get('if-none-match') === `"${m.artifactSha256}"`) return res.status(304).end();

      res.json({
        version: m.version,
        features: m.features,
        mean: m.mean,
        scale: m.scale,
        coefficients: m.coefficients,
        intercept: m.intercept,
        metrics: {
          auc: m.metrics.auc,
          brier: m.metrics.brier,
          calibrationSlope: m.metrics.calibrationSlope,
          holdoutRows: m.metrics.holdoutRows,
        },
        sha256: m.artifactSha256,
        activatedAt: m.activatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
